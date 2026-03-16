FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else
COPY . ./

# Install dotnet-watch for hot reload
RUN dotnet tool install --global dotnet-watch
ENV PATH="$PATH:/root/.dotnet/tools"

EXPOSE 5000

# Run with hot reload
CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:5000"]