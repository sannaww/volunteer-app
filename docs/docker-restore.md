# Docker Data Restore

On the first start of a fresh Postgres volume, Docker Compose restores data from `merged_latest_20260512.dump`.

If you need to rerun the restore from scratch:

```bash
docker compose --profile dev down -v
docker compose --profile dev up -d --build
```
