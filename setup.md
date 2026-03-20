## Requirements:
- https://docs.docker.com/desktop/setup/install/windows-install/
- https://dotnet.microsoft.com/en-us/download
- https://nodejs.org/en/download

### per me e setup run these:

me ni terminal per back:
```
docker compose up --build
```

Backend now restores required .NET tools and applies EF migrations automatically on startup.

me ni terminal per front:
```
cd cinema-frontend
npm install
npm run dev
```

### Per me e run (prap separate terminals):

```
docker compose up
```
```
cd cinema-frontend
npm run dev
```