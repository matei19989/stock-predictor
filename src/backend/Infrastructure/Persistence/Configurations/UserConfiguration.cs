using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Username).IsRequired().HasMaxLength(30);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(100);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.Username).IsUnique();
        builder.Property(u => u.PreferencesJson).HasColumnType("text");

        builder.Property(u => u.IsEmailConfirmed).HasDefaultValue(false);
        builder.Property(u => u.EmailConfirmationToken).HasMaxLength(36);
        builder.HasIndex(u => u.EmailConfirmationToken)
            .IsUnique()
            .HasFilter("\"EmailConfirmationToken\" IS NOT NULL");
    }
}
