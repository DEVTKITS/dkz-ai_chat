#!/usr/bin/env python3
"""NOUZ-Term — Datenexport. Misst den Ist-Zustand und schreibt window.NOUZ_DATA nach data.local.js.

Grundsatz: nur Messbares. Alles, was sich hier nicht messen lässt, bleibt leer (die Oberfläche zeigt dann
„— ausstehend —") — es werden keine Zähler, Zustände oder Beziehungen erfunden.

Quellen
  Herd        data/a2a/*.jsonl          (Inboxen des A2A-Busses; Name, letzte Nachrichten)
  Dateien     git ls-files              (Tiefe <= 3, höchstens 250 Einträge; letzter Commit je Datei, erste 60)
  Worktrees   git worktree list
  Dienste     HTTP-Gesundheitsprüfung   (Gitea, OpenCloud, Immich, nanoChat, Atuin; 1,5 s Zeitlimit)
  Wissen      Skill-Registry, verlinkte Skills, llms.txt; GitNexus/Graphify/LLM-Wiki/NOUZ bleiben „nicht verbunden"
  Palette     Befehle aus dem Kopf von bin/odysseus, letzte 15 Commits
Bewusst NICHT exportiert: Shell-Verlauf (kann Zugangsdaten enthalten), .env, Vault, Dateiinhalte.

Aufruf (meist über `odysseus nouz export`):
  nouz-export.py [--repo PFAD] [--out DATEI] [--a2a-dir PFAD] [--no-probe] [--stdout]"""
import argparse, json, os, re, shutil, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ODY = HERE.parent
CTRL = re.compile(r"[\x00-\x1f\x7f  ]")


def run(cmd, cwd=None, timeout=10):
    """Befehl als Argumentliste (nie über eine Shell). None bei Fehler."""
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout if r.returncode == 0 else None


def clean(s, n=200):
    return CTRL.sub(" ", str(s))[:n].strip()


def ident(name):
    return re.sub(r"[^A-Za-z0-9_.-]", "-", name)[:48] or "agent"


def probe(url):
    """-> (state, detail). Verbindungsfehler = offline; 2xx = ready; sonst error mit Statuscode.
    Ohne Proxy: die Dienste laufen lokal, und eine gesetzte HTTP_PROXY ohne NO_PROXY würde sie sonst
    fälschlich als offline melden."""
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(url, timeout=1.5) as r:
            return ("ready", f"HTTP {r.status}") if 200 <= r.status < 300 else ("error", f"HTTP {r.status}")
    except urllib.error.HTTPError as e:
        return "error", f"HTTP {e.code}"
    except (urllib.error.URLError, OSError, ValueError):
        return "offline", None


def git(repo, *args):
    return run(["git", "-C", str(repo), *args]) if repo else None


def file_entries(repo, limit=250, max_dir_depth=2):
    out = git(repo, "ls-files", "-z")
    paths = sorted(p for p in (out or "").split("\0") if p)
    tree = {}
    for p in paths:
        parts = p.split("/")
        if len(parts) > max_dir_depth + 2:
            continue
        node = tree
        for d in parts[:-1]:
            node = node.setdefault(d, {})
        node[parts[-1]] = None
    entries = []

    def walk(node, depth, prefix):
        for k in sorted(k for k, v in node.items() if isinstance(v, dict)):
            entries.append({"name": k, "type": "dir", "depth": depth, "_p": prefix + k})
            walk(node[k], depth + 1, prefix + k + "/")
        for k in sorted(k for k, v in node.items() if v is None):
            entries.append({"name": k, "type": "file", "depth": depth, "_p": prefix + k})

    walk(tree, 0, "")
    entries = entries[:limit]
    files = [x for x in entries if x["type"] == "file"]
    for e in files:
        try:
            e["size"] = f"{(Path(repo) / e['_p']).stat().st_size} B"
        except OSError:
            pass
    # Commit-Info (ein git-Aufruf je Datei) für die 60 flachsten Dateien: Wurzeldateien zuerst, nicht die
    # zufällig ersten in Baumreihenfolge, die alle in Unterordnern liegen.
    for e in sorted(files, key=lambda x: x["depth"])[:60]:
        info = git(repo, "log", "-1", "--format=%h %s%x09%ad", "--date=short", "--", e["_p"])
        if info:
            msg, _, date = info.strip().partition("\t")
            e["commit"], e["date"] = clean(msg, 90), clean(date, 10)
    for e in entries:
        e.pop("_p", None)
    return entries, len(paths)


def agents_from_a2a(a2a_dir):
    agents, seen = [], set()
    if not a2a_dir.is_dir():
        return agents
    for f in sorted(a2a_dir.glob("*.jsonl")):
        msgs = []
        try:
            for line in f.read_text(encoding="utf-8", errors="replace").splitlines()[-200:]:
                try:
                    m = json.loads(line)
                    if isinstance(m, dict):
                        msgs.append(m)
                except ValueError:
                    pass
        except OSError:
            continue
        aid = ident(f.stem)
        if aid in seen:
            continue
        seen.add(aid)
        log = [[["a", "[a2a]"], ["", f" Inbox {aid} · {len(msgs)} Nachrichten"]]] if msgs else \
              [[["m", "[a2a]"], ["", f" Inbox {aid} ist leer"]]]
        for m in msgs[-5:]:
            log.append([["m", "[a2a]"], ["", f" {clean(m.get('ts', ''), 25)}  {clean(m.get('from', '?'), 30)}: {clean(m.get('msg', ''))}"]])
        # Ob ein Agent die Nachrichten bearbeitet, ist nicht messbar: mit Post = waiting, leer = unknown.
        agents.append({"id": aid, "name": aid, "parent": None, "state": "waiting" if msgs else "unknown", "log": log})
    return agents


def commands_from_launcher():
    out = []
    try:
        for line in (ODY / "bin" / "odysseus").read_text(encoding="utf-8").splitlines()[:40]:
            m = re.match(r"^#\s{2,}odysseus\s+(\S[^ ]*(?: [^ ]+)?)\s{2,}\S", line)
            if m:
                for part in re.sub(r"\s*\.\.\.$", "", m.group(1)).split("|"):
                    out.append("odysseus " + part.strip())
    except OSError:
        pass
    return [{"type": "COMMAND", "text": c, "source": "odysseus", "action": "cmd:" + c} for c in out[:20]]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repo", help="Git-Verzeichnis (Standard: Repo, in dem dieses Skript liegt, sonst das aktuelle)")
    ap.add_argument("--out", help="Zieldatei (Standard: <repo>/nouz-term/data.local.js)")
    ap.add_argument("--a2a-dir", help="Inbox-Ordner (Standard: <odysseus>/data/a2a)")
    ap.add_argument("--no-probe", action="store_true", help="keine HTTP-Prüfung der Dienste")
    ap.add_argument("--stdout", action="store_true", help="JSON ausgeben statt Datei schreiben")
    a = ap.parse_args()

    start = Path(a.repo).resolve() if a.repo else (ODY if git(ODY, "rev-parse", "--show-toplevel") else Path.cwd())
    top = (git(start, "rev-parse", "--show-toplevel") or "").strip()
    repo = Path(top) if top else None
    name = repo.name if repo else start.name
    branch = (git(repo, "rev-parse", "--abbrev-ref", "HEAD") or "").strip() or None
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    files, nfiles = file_entries(repo)
    ncommits = (git(repo, "rev-list", "--count", "HEAD") or "").strip()
    worktrees = []
    for blk in (git(repo, "worktree", "list", "--porcelain") or "").split("\n\n"):
        br = re.search(r"^branch refs/heads/(.+)$", blk, re.M)
        hd = re.search(r"^HEAD (\w{7})", blk, re.M)
        if br or hd:
            worktrees.append(clean(br.group(1) if br else "(detached) " + hd.group(1), 80))

    # Werkzeugkette: gefunden oder nicht. Mehr lässt sich ohne Zugriff auf die Programme nicht sagen.
    stack = []
    for tid, label in (("ghostty", "GHOSTTY"), ("zellij", "ZELLIJ"), ("herdr", "HERDR")):
        found = shutil.which(tid) is not None
        detail = "" if found else "nicht gefunden"
        if found and tid == "zellij":
            sess = (run(["zellij", "list-sessions", "--short", "--no-formatting"]) or "").strip().splitlines()
            detail = clean(sess[0], 40) if sess else ""
        stack.append({"id": tid, "name": label, "detail": detail, "state": "on" if found else "offline"})

    ports = {k: os.environ.get(k, d) for k, d in (("GITEA_PORT", "3300"), ("OPENCLOUD_PORT", "9200"), ("IMMICH_PORT", "2283"),
                                                    ("LIBRECHAT_PORT", "3080"), ("ATUIN_PORT", "8888"))}
    checks = [("gitea", "Gitea", "GIT", f"http://127.0.0.1:{ports['GITEA_PORT']}/api/healthz"),
              ("opencloud", "OpenCloud", "OC", f"http://127.0.0.1:{ports['OPENCLOUD_PORT']}/status.php"),
              ("immich", "Immich", "IM", f"http://127.0.0.1:{ports['IMMICH_PORT']}/api/server/ping"),
              ("nanochat", "nanoCHAT", "NC", f"http://127.0.0.1:{ports['LIBRECHAT_PORT']}/health")]
    services = []
    for sid, sname, code, url in checks:
        st, det = ("unknown", None) if a.no_probe else probe(url)
        services.append({"id": sid, "name": sname, "code": code, "state": st, "detail": det})

    atuin = ("unknown", None) if a.no_probe else probe(f"http://127.0.0.1:{ports['ATUIN_PORT']}/")
    skills_dir = Path.home() / ".claude" / "skills"
    nskills = None
    if skills_dir.is_dir():
        # Gezählt werden echte SKILL.md (Tiefe <= 4, Symlinks gefolgt, gedeckelt gegen Zyklen), nicht Ordner.
        nskills, base = 0, len(skills_dir.parts)
        for root, dirs, fnames in os.walk(skills_dir, followlinks=True):
            if len(Path(root).parts) - base >= 4:
                dirs[:] = []
            nskills += "SKILL.md" in fnames
            if nskills >= 5000:
                break
    skills_detail = None if nskills is None else f"{nskills} Skills"
    reg = ODY / "skills" / "registry" / "packs.tsv"
    npacks = sum(1 for l in reg.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")) if reg.is_file() else None
    llms = repo / "llms.txt" if repo else None
    if skills_detail and npacks:
        skills_detail += f" · Registry {npacks} Packs"
    knowledge = [
        {"id": "atuin", "code": "A", "name": "ATUIN", "state": atuin[0] if atuin[0] != "error" else "updating", "detail": atuin[1]},
        {"id": "skills", "code": "SK", "name": "Skills", "state": "ready" if nskills else "unknown", "detail": skills_detail},
        {"id": "llmstxt", "code": "LLMS", "name": "llms.txt", "state": "ready" if llms and llms.is_file() else "unknown",
         "detail": f"{len(llms.read_text(encoding='utf-8', errors='replace').splitlines())} Zeilen" if llms and llms.is_file() else None},
        {"id": "gitnexus", "code": "GNX", "name": "GitNexus", "state": "unknown", "detail": None},
        {"id": "graphify", "code": "GF", "name": "Graphify", "state": "unknown", "detail": None},
        {"id": "llmwiki", "code": "LW", "name": "LLM-Wiki", "state": "unknown", "detail": None},
        {"id": "nouz", "code": "NOUZ", "name": "NOUZ", "state": "unknown", "detail": None},
    ]

    a2a = Path(a.a2a_dir) if a.a2a_dir else ODY / "data" / "a2a"
    agents = agents_from_a2a(a2a)
    commits = []
    for line in (git(repo, "log", "-15", "--format=%h%x09%s") or "").splitlines():
        sha, _, subj = line.partition("\t")
        commits.append({"type": "COMMIT", "text": clean(f"{sha} {subj}", 100), "source": "git", "action": "query:" + sha})
    readme = next((f["name"] for f in files if f["type"] == "file" and f["name"].lower() == "readme.md"), None)

    connected = [k for k in knowledge if k["state"] == "ready"]
    data = {
        "meta": {"mode": "live", "repo": name, "branch": branch, "generated": now, "version": (git(repo, "describe", "--always", "--dirty") or "").strip() or None,
                 "focus": agents[0]["id"] if agents else None, "file": readme,
                 "extra": " · ".join(x for x in (f"{ncommits} Commits" if ncommits else "", f"{nfiles} Dateien" if nfiles else "") if x) or None},
        "stack": stack, "agents": agents, "files": files, "worktrees": worktrees,
        "knowledge": knowledge, "services": services,
        "graph": {"center": "repo", "nodes": [{"id": "repo", "label": clean(name, 24)}] + [{"id": k["id"], "label": k["name"]} for k in connected]},
        "index": commands_from_launcher() + commits,
        "boot": [
            [["m", "[context]"], ["", f" repo={name}  branch={branch or '— ausstehend —'}"]],
            [["m", "[export]"], ["", f" {now} · {nfiles} Dateien · {len(agents)} Inboxen · {len(services)} Dienste geprüft" + (" (Prüfung übersprungen)" if a.no_probe else "")]],
            [["m", "[hinweis]"], ["", " Was nicht messbar war, steht als „— ausstehend —“. Nichts davon wurde erfunden."]],
        ],
    }
    js = "/* NOUZ-Term Live-Daten, erzeugt von odysseus nouz export. Lokal, nicht einchecken. */\nwindow.NOUZ_DATA = " + \
         json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n"
    if a.stdout:
        sys.stdout.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        return
    out = Path(a.out) if a.out else ((repo / "nouz-term" / "data.local.js") if repo and (repo / "nouz-term").is_dir() else Path.cwd() / "data.local.js")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(js, encoding="utf-8")
    try:
        out.chmod(0o600)
    except OSError:
        pass
    print(f"[nouz] {out}")
    print(f"[nouz] {nfiles} Dateien · {len(agents)} Inboxen · {len(services)} Dienste · {len(commits)} Commits")
    print(f"[nouz] öffnen: file://{out.parent}/index.html?live")


if __name__ == "__main__":
    main()
