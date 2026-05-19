using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.TwinPeaks.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserFavoritesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserFavoriteMovies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TmdbId = table.Column<int>(type: "int", nullable: false),
                    MovieTitle = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PosterPath = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFavoriteMovies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserFavoriteMovies_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteMovies_UserId_TmdbId",
                table: "UserFavoriteMovies",
                columns: new[] { "UserId", "TmdbId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserFavoriteMovies");
        }
    }
}