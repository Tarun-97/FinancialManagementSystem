-- MySQL 8 schema, utf8mb4 + InnoDB
-- Create database (adjust name if needed)
CREATE DATABASE IF NOT EXISTS fms CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE fms;

-- States
CREATE TABLE States (
  StateID BIGINT PRIMARY KEY AUTO_INCREMENT,
  StateName VARCHAR(200) NOT NULL,
  ISOCode VARCHAR(10) NOT NULL,
  ActiveFrom DATE NOT NULL,
  ActiveTo DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Departments (self-referencing ParentDepartmentID)
CREATE TABLE Departments (
  DepartmentID BIGINT PRIMARY KEY AUTO_INCREMENT,
  StateID BIGINT NOT NULL,
  DeptCode VARCHAR(50) NOT NULL,
  DeptName VARCHAR(200) NOT NULL,
  ParentDepartmentID BIGINT NULL,
  CONSTRAINT fk_departments_state
    FOREIGN KEY (StateID) REFERENCES States(StateID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_departments_parent
    FOREIGN KEY (ParentDepartmentID) REFERENCES Departments(DepartmentID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- FiscalYears
CREATE TABLE FiscalYears (
  FiscalYearID BIGINT PRIMARY KEY AUTO_INCREMENT,
  YearLabel VARCHAR(20) NOT NULL,
  StartDate DATE NOT NULL,
  EndDate DATE NOT NULL,
  IsCurrent BOOLEAN NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ChartOfAccounts
-- AccountType: {Revenue, Expense, Asset, Liability, Equity} enforced via API/front-end (DDL comment)
CREATE TABLE ChartOfAccounts (
  AccountID BIGINT PRIMARY KEY AUTO_INCREMENT,
  AccountCode VARCHAR(50) NOT NULL,
  AccountName VARCHAR(200) NOT NULL,
  AccountType VARCHAR(20) NOT NULL,
  EconomicClass VARCHAR(50) NULL,
  FunctionalClass VARCHAR(50) NULL,
  FundCode VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Budgets
CREATE TABLE Budgets (
  BudgetID BIGINT PRIMARY KEY AUTO_INCREMENT,
  DepartmentID BIGINT NOT NULL,
  FiscalYearID BIGINT NOT NULL,
  AccountID BIGINT NOT NULL,
  FundCode VARCHAR(50) NOT NULL,
  ApprovedAmount DECIMAL(18,2) NOT NULL,
  RevisedAmount DECIMAL(18,2) NOT NULL,
  Notes VARCHAR(500) NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_department
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_budgets_fiscalyear
    FOREIGN KEY (FiscalYearID) REFERENCES FiscalYears(FiscalYearID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_budgets_account
    FOREIGN KEY (AccountID) REFERENCES ChartOfAccounts(AccountID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_budgets UNIQUE (DepartmentID, FiscalYearID, AccountID, FundCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Expenditures
CREATE TABLE Expenditures (
  ExpenditureID BIGINT PRIMARY KEY AUTO_INCREMENT,
  DepartmentID BIGINT NOT NULL,
  FiscalYearID BIGINT NOT NULL,
  AccountID BIGINT NOT NULL,
  ExpenditureDate DATE NOT NULL,
  Amount DECIMAL(18,2) NOT NULL,
  PaymentRef VARCHAR(100) NULL,
  Description VARCHAR(500) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenditures_department
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_expenditures_fiscalyear
    FOREIGN KEY (FiscalYearID) REFERENCES FiscalYears(FiscalYearID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_expenditures_account
    FOREIGN KEY (AccountID) REFERENCES ChartOfAccounts(AccountID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Indexes
CREATE INDEX idx_budgets_dept_fy ON Budgets (DepartmentID, FiscalYearID);
CREATE INDEX idx_expenditures_date ON Expenditures (ExpenditureDate);
CREATE INDEX idx_expenditures_dept_account ON Expenditures (DepartmentID, AccountID);

-- ================================
-- Yearly totals infrastructure (TRIGGERS + SUMMARY TABLE)
-- ================================

-- Summarized yearly totals per Department, FiscalYear, AccountType
CREATE TABLE IF NOT EXISTS DepartmentFiscalYearTotals (
  DepartmentID BIGINT NOT NULL,
  FiscalYearID BIGINT NOT NULL,
  AccountType  VARCHAR(20) NOT NULL,  -- Revenue, Expense, Asset, Liability, Equity
  Total        DECIMAL(18,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (DepartmentID, FiscalYearID, AccountType),
  CONSTRAINT fk_dfyt_department FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_dfyt_fy FOREIGN KEY (FiscalYearID) REFERENCES FiscalYears(FiscalYearID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Validation: ExpenditureDate must fall within its FiscalYear range
DROP TRIGGER IF EXISTS trg_exp_before_ins;
DELIMITER $$
CREATE TRIGGER trg_exp_before_ins
BEFORE INSERT ON Expenditures
FOR EACH ROW
BEGIN
  DECLARE fyStart DATE;
  DECLARE fyEnd   DATE;
  SELECT StartDate, EndDate INTO fyStart, fyEnd
  FROM FiscalYears
  WHERE FiscalYearID = NEW.FiscalYearID;

  IF fyStart IS NULL OR fyEnd IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid FiscalYearID for Expenditures';
  END IF;

  IF NEW.ExpenditureDate < fyStart OR NEW.ExpenditureDate > fyEnd THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ExpenditureDate outside FiscalYear range';
  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_exp_before_upd;
DELIMITER $$
CREATE TRIGGER trg_exp_before_upd
BEFORE UPDATE ON Expenditures
FOR EACH ROW
BEGIN
  DECLARE fyStart DATE;
  DECLARE fyEnd   DATE;
  DECLARE tgtFY   BIGINT;
  DECLARE tgtDate DATE;

  SET tgtFY  = COALESCE(NEW.FiscalYearID, OLD.FiscalYearID);
  SET tgtDate = COALESCE(NEW.ExpenditureDate, OLD.ExpenditureDate);

  SELECT StartDate, EndDate INTO fyStart, fyEnd
  FROM FiscalYears
  WHERE FiscalYearID = tgtFY;

  IF fyStart IS NULL OR fyEnd IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid FiscalYearID for Expenditures';
  END IF;

  IF tgtDate < fyStart OR tgtDate > fyEnd THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ExpenditureDate outside FiscalYear range';
  END IF;
END$$
DELIMITER ;

-- Helper proc: upsert yearly total delta from an Expenditures change
DROP PROCEDURE IF EXISTS sp_upsert_year_total;
DELIMITER $$
CREATE PROCEDURE sp_upsert_year_total(
  IN pDept BIGINT, IN pFY BIGINT, IN pAccountID BIGINT, IN pDelta DECIMAL(18,2)
)
BEGIN
  DECLARE vType VARCHAR(20);
  SELECT AccountType INTO vType
  FROM ChartOfAccounts
  WHERE AccountID = pAccountID;

  IF vType IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid AccountID for Expenditures';
  END IF;

  INSERT INTO DepartmentFiscalYearTotals (DepartmentID, FiscalYearID, AccountType, Total)
  VALUES (pDept, pFY, vType, pDelta)
  ON DUPLICATE KEY UPDATE Total = Total + VALUES(Total);
END$$
DELIMITER ;

-- Maintain yearly totals on INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS trg_exp_after_ins;
DELIMITER $$
CREATE TRIGGER trg_exp_after_ins
AFTER INSERT ON Expenditures
FOR EACH ROW
BEGIN
  CALL sp_upsert_year_total(NEW.DepartmentID, NEW.FiscalYearID, NEW.AccountID,  NEW.Amount);
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_exp_after_upd;
DELIMITER $$
CREATE TRIGGER trg_exp_after_upd
AFTER UPDATE ON Expenditures
FOR EACH ROW
BEGIN
  -- subtract old row’s effect
  CALL sp_upsert_year_total(OLD.DepartmentID, OLD.FiscalYearID, OLD.AccountID, -OLD.Amount);
  -- add new row’s effect
  CALL sp_upsert_year_total(NEW.DepartmentID, NEW.FiscalYearID, NEW.AccountID,  NEW.Amount);
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_exp_after_del;
DELIMITER $$
CREATE TRIGGER trg_exp_after_del
AFTER DELETE ON Expenditures
FOR EACH ROW
BEGIN
  CALL sp_upsert_year_total(OLD.DepartmentID, OLD.FiscalYearID, OLD.AccountID, -OLD.Amount);
END$$
DELIMITER ;
