using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockPredictor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStockVisitsAndPredictionLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StockId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockVisits_Stocks_StockId",
                        column: x => x.StockId,
                        principalTable: "Stocks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockVisits_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPredictionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StockId = table.Column<Guid>(type: "uuid", nullable: false),
                    Horizon = table.Column<int>(type: "integer", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPredictionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPredictionLogs_Stocks_StockId",
                        column: x => x.StockId,
                        principalTable: "Stocks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserPredictionLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockVisits_StockId",
                table: "StockVisits",
                column: "StockId");

            migrationBuilder.CreateIndex(
                name: "IX_StockVisits_UserId_StockId",
                table: "StockVisits",
                columns: new[] { "UserId", "StockId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserPredictionLogs_StockId",
                table: "UserPredictionLogs",
                column: "StockId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPredictionLogs_UserId_StockId_Horizon",
                table: "UserPredictionLogs",
                columns: new[] { "UserId", "StockId", "Horizon" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockVisits");

            migrationBuilder.DropTable(
                name: "UserPredictionLogs");
        }
    }
}
