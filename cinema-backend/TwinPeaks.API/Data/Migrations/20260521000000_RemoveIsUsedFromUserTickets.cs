using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.TwinPeaks.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveIsUsedFromUserTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsUsed",
                table: "UserTickets");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsUsed",
                table: "UserTickets",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }
    }
}
