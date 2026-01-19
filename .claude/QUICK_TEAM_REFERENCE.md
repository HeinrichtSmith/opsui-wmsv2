# Quick Team Reference

## Repository
**https://github.com/opsui/opsui-wmsv2**

## Before Starting Work
```bash
git pull --rebase origin main
```

## After AI Completes Work
The auto-push hook will:
1. Pull latest team changes
2. Rebase your changes on top
3. Push if safe, or stop if conflicts

## If Conflicts Occur
```bash
git status                    # See conflicted files
# Edit files, remove conflict markers
git add .                     # Mark as resolved
git rebase --continue         # Finish rebase
git push origin main          # Push manually
```

## Team Chat Communication
Always post in team chat when:
- Starting large features
- Working on shared files
- Encountering conflicts

## Module Ownership
- **Picking**: @friend1
- **Packing**: @friend2
- **Admin/General**: @Heinricht

## Full Documentation
- [TEAM_COLLABORATION.md](../TEAM_COLLABORATION.md) - Complete team workflow guide
- [MCP_SETUP.md](../MCP_SETUP.md) - MCP server setup
- [README.md](../README.md) - Project overview
