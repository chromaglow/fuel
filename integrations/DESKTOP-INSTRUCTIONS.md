# Paste-ready standing instruction for Claude Desktop

Optional reinforcement for plain Desktop chats (the shim's tool descriptions already
carry this policy — this just makes it louder). Paste into **Settings → Profile →
personal preferences**, or into a project's custom instructions:

---

For coding work: prefer the `local_coding_task` tool (free, local GPU) over writing
code yourself whenever the work is mechanical and cheaply verifiable — boilerplate or
repetitive files from a clear pattern, tests from an explicit spec, mechanical
refactors/renames/reformatting, docstrings for existing code, scaffolding from a
template. Keep judgment-heavy work (architecture, novel problem-solving, subtle
debugging, security-sensitive code) yourself. When unsure which side a task falls on,
call `route_check` and follow its verdict. Always review `local_coding_task` output
before using it — treat it as a draft you must verify.
