# Zyger Manufacturing ERP - Java Full Stack

This is the Java full-stack demo migration of the Manufacturing ERP.

## Tech Stack

- Java 17
- Spring Boot 3
- Spring JDBC
- H2 demo database by default
- PostgreSQL-ready production profile
- Static HTML/CSS/JS frontend served by Spring Boot

## Run Locally

```powershell
cd C:\Users\gugas\OneDrive\Desktop\Connectivity\Zyger\manufacturing-erp-java
mvn spring-boot:run
```

Open:

```text
http://localhost:8080
```

API health:

```text
http://localhost:8080/api/health
```

H2 database console:

```text
http://localhost:8080/h2-console
```

H2 JDBC URL:

```text
jdbc:h2:mem:zyger_erp
```

Login:

```text
admin@zygerdemo.com
Demo@123
```

## PostgreSQL Run

```powershell
$env:SPRING_PROFILES_ACTIVE="postgres"
$env:DB_HOST="localhost"
$env:DB_PORT="5435"
$env:DB_NAME="ar_precision_erp"
$env:DB_USER="postgres"
$env:DB_PASSWORD="Demo@12345"
mvn spring-boot:run
```

## Demo Flow Included

CRM lead -> Sales Order -> BOM -> MRP -> Purchase Request -> Purchase Order -> PO Inward -> Quality Inspection -> Stock -> Sales DC -> Tax/Sale Invoice -> Subcontractor DC.
