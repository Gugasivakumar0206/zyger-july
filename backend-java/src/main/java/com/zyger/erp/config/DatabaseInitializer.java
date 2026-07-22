package com.zyger.erp.config;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

@Configuration
public class DatabaseInitializer {
    @Bean
    @Profile("!postgres")
    ApplicationRunner initializeH2DemoDatabase(DataSource dataSource) {
        return args -> {
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.setContinueOnError(false);
            populator.addScript(new ClassPathResource("schema.sql"));
            populator.addScript(new ClassPathResource("data.sql"));
            populator.execute(dataSource);
        };
    }

    @Bean
    @Profile("postgres")
    ApplicationRunner initializePostgresSchema(DataSource dataSource) {
        return args -> {
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.setContinueOnError(true);
            populator.addScript(new ClassPathResource("schema.sql"));
            populator.execute(dataSource);

            try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
                statement.execute("ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50)");
                statement.execute("ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS location VARCHAR(200)");
                statement.execute("ALTER TABLE inward_inspection_items ADD COLUMN IF NOT EXISTS hold_qty NUMERIC(14,2) DEFAULT 0");
                statement.execute("ALTER TABLE inward_inspection_items ADD COLUMN IF NOT EXISTS idle_stock_qty NUMERIC(14,2) DEFAULT 0");
                statement.execute("ALTER TABLE inward_inspection_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT");
                statement.execute("ALTER TABLE inward_inspection_items ADD COLUMN IF NOT EXISTS location VARCHAR(200)");
                statement.execute("ALTER TABLE purchase_inward ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Received'");
                statement.execute("ALTER TABLE sales_dc ADD COLUMN IF NOT EXISTS po_number VARCHAR(100)");
            }
        };
    }
}