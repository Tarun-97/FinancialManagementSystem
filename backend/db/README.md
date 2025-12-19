# FMS Database Setup

- Requires MySQL 8 with InnoDB and utf8mb4 collation.

## Create and migrate
- Login: mysql -u root -p
- Run migrations:
  - SOURCE /absolute/path/to/db/migrations/001_init.sql;
  - SOURCE /absolute/path/to/db/migrations/002_seed_minimal.sql;

## Charset/Engine
- Database uses utf8mb4_0900_ai_ci and ENGINE=InnoDB for FK support.

## Notes
- Foreign keys: ON UPDATE CASCADE, ON DELETE RESTRICT.
- Money fields: DECIMAL(18,2).
- Dates: DATE; timestamps default on CreatedAt where defined.
