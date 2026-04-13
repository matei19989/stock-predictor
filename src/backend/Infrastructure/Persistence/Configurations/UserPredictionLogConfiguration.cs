using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class UserPredictionLogConfiguration : IEntityTypeConfiguration<UserPredictionLog>
{
    public void Configure(EntityTypeBuilder<UserPredictionLog> builder)
    {
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => new { p.UserId, p.StockId, p.Horizon }).IsUnique();
        builder.HasOne(p => p.User)
               .WithMany(u => u.PredictionLogs)
               .HasForeignKey(p => p.UserId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.Stock)
               .WithMany(s => s.PredictionLogs)
               .HasForeignKey(p => p.StockId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
