using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.TwinPeaks.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class MakeLegacyUserRolesColumnNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
SET @roles_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Users'
      AND COLUMN_NAME = 'Roles'
);
SET @alter_sql = IF(
    @roles_column_exists > 0,
    'ALTER TABLE `Users` MODIFY COLUMN `Roles` longtext NULL',
    'DO 0'
);
PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: we do not force legacy schema constraints back in Down.
        }
    }
}
