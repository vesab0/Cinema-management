FROM mcr.microsoft.com/dotnet/sdk:9.0

WORKDIR /app

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else
COPY . ./

EXPOSE 5000

# Copy entrypoint script and make executable
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run migrations then start the app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]