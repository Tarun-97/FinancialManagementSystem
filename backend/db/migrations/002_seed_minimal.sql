-- Use target DB
USE fms;

-- Optional reset for local dev ONLY
-- SET FOREIGN_KEY_CHECKS=0;
-- TRUNCATE TABLE DepartmentFiscalYearTotals;
-- TRUNCATE TABLE Expenditures;
-- TRUNCATE TABLE Budgets;
-- TRUNCATE TABLE ChartOfAccounts;
-- TRUNCATE TABLE Departments;
-- TRUNCATE TABLE States;
-- TRUNCATE TABLE FiscalYears;
-- SET FOREIGN_KEY_CHECKS=1;

-- States (5 diverse states)
INSERT INTO States (StateName, ISOCode, ActiveFrom, ActiveTo) VALUES
('Andhra Pradesh', 'AP', '1953-10-01', NULL),
('Karnataka', 'KA', '1956-11-01', NULL),
('Maharashtra', 'MH', '1960-05-01', NULL),
('Tamil Nadu', 'TN', '1956-11-01', NULL),
('Delhi', 'DL', '1956-11-01', NULL);

-- Fiscal Years (3 consecutive)
-- FY 2022-23, FY 2023-24, FY 2024-25 (Apr–Mar)
INSERT INTO FiscalYears (YearLabel, StartDate, EndDate, IsCurrent) VALUES
('FY 2022-23', '2022-04-01', '2023-03-31', 0),
('FY 2023-24', '2023-04-01', '2024-03-31', 0),
('FY 2024-25', '2024-04-01', '2025-03-31', 1);

-- Departments: 4 per state (Finance, Health, Education, PWD)
-- Insert order determines IDs
INSERT INTO Departments (StateID, DeptCode, DeptName, ParentDepartmentID) VALUES
-- AP (StateID=1)
(1, 'FIN', 'Finance Department', NULL),
(1, 'HLT', 'Health and Family Welfare', NULL),
(1, 'EDU', 'School Education', NULL),
(1, 'PWD', 'Public Works', NULL),
-- KA (StateID=2)
(2, 'FIN', 'Finance Department', NULL),
(2, 'HLT', 'Health and Family Welfare', NULL),
(2, 'EDU', 'Primary and Secondary Education', NULL),
(2, 'PWD', 'Public Works, Ports & Inland Water', NULL),
-- MH (StateID=3)
(3, 'FIN', 'Finance Department', NULL),
(3, 'HLT', 'Public Health Department', NULL),
(3, 'EDU', 'School Education and Sports', NULL),
(3, 'PWD', 'Public Works Department', NULL),
-- TN (StateID=4)
(4, 'FIN', 'Finance Department', NULL),
(4, 'HLT', 'Health and Family Welfare', NULL),
(4, 'EDU', 'School Education Department', NULL),
(4, 'PWD', 'Public Works Department', NULL),
-- DL (StateID=5)
(5, 'FIN', 'Finance Department', NULL),
(5, 'HLT', 'Health and Family Welfare', NULL),
(5, 'EDU', 'Education Department', NULL),
(5, 'PWD', 'Public Works Department', NULL);

-- Chart of Accounts (Revenue/Expense + a couple of balance sheet lines)
INSERT INTO ChartOfAccounts (AccountCode, AccountName, AccountType, EconomicClass, FunctionalClass, FundCode) VALUES
('REV-0001', 'State GST Collections', 'Revenue', 'Tax', 'Own Tax', 'GF'),
('REV-0002', 'State Excise Duty', 'Revenue', 'Tax', 'Own Tax', 'GF'),
('EXP-1001', 'Salaries and Wages', 'Expense', 'Compensation', 'Administration', 'GF'),
('EXP-1002', 'Drugs and Consumables', 'Expense', 'Supplies', 'Health', 'GF'),
('EXP-1003', 'Road Maintenance', 'Expense', 'Maintenance', 'PWD', 'GF'),
('AST-2001', 'Cash and Bank Balances', 'Asset', 'Current', 'Treasury', 'GF'),
('LIAB-3001', 'Payables', 'Liability', 'Current', 'Admin', 'GF');

-- Map for readability (based on insert order)
-- FiscalYearIDs: 1 = 2022-23, 2 = 2023-24, 3 = 2024-25
-- Departments per state (4 each) in order AP(1..4), KA(5..8), MH(9..12), TN(13..16), DL(17..20)

-- Budgets for each FY: scale by state and year to vary graphs
-- Helper note:
--   Salaries (EXP-1001) grows ~4-6% YoY
--   Drugs (EXP-1002) grows ~6-8% YoY, higher in Health-focused states
--   Roads (EXP-1003) grows ~5-7% YoY, higher in infra-heavy states
--   Revenue (REV-0001/0002) grows ~5-10% YoY, higher base in MH, KA, TN, DL; moderate in AP

-- FY 2022-23 (FiscalYearID=1)
INSERT INTO Budgets (DepartmentID, FiscalYearID, AccountID, FundCode, ApprovedAmount, RevisedAmount, Notes) VALUES
-- AP (dept 1..4)
(1, 1, 3, 'GF',  95000000.00,  96000000.00, 'AP FIN salaries 22-23'),
(2, 1, 4, 'GF',  65000000.00,  66000000.00, 'AP HLT drugs 22-23'),
(3, 1, 3, 'GF', 110000000.00, 110000000.00, 'AP EDU salaries 22-23'),
(4, 1, 5, 'GF',  80000000.00,  82000000.00, 'AP PWD roads 22-23'),
-- KA (dept 5..8)
(5, 1, 3, 'GF', 105000000.00, 106000000.00, 'KA FIN salaries 22-23'),
(6, 1, 4, 'GF',  90000000.00,  90500000.00, 'KA HLT drugs 22-23'),
(7, 1, 3, 'GF', 125000000.00, 125500000.00, 'KA EDU salaries 22-23'),
(8, 1, 5, 'GF', 100000000.00, 101000000.00, 'KA PWD roads 22-23'),
-- MH (dept 9..12)
(9,  1, 3, 'GF', 120000000.00, 121000000.00, 'MH FIN salaries 22-23'),
(10, 1, 4, 'GF', 150000000.00, 150500000.00, 'MH HLT drugs 22-23'),
(11, 1, 3, 'GF', 140000000.00, 141000000.00, 'MH EDU salaries 22-23'),
(12, 1, 5, 'GF', 180000000.00, 181000000.00, 'MH PWD roads 22-23'),
-- TN (dept 13..16)
(13, 1, 3, 'GF', 110000000.00, 111000000.00, 'TN FIN salaries 22-23'),
(14, 1, 4, 'GF', 100000000.00, 100500000.00, 'TN HLT drugs 22-23'),
(15, 1, 3, 'GF', 135000000.00, 136000000.00, 'TN EDU salaries 22-23'),
(16, 1, 5, 'GF', 140000000.00, 141500000.00, 'TN PWD roads 22-23'),
-- DL (dept 17..20)
(17, 1, 3, 'GF',  98000000.00,  98500000.00, 'DL FIN salaries 22-23'),
(18, 1, 4, 'GF', 110000000.00, 110500000.00, 'DL HLT drugs 22-23'),
(19, 1, 3, 'GF', 120000000.00, 120500000.00, 'DL EDU salaries 22-23'),
(20, 1, 5, 'GF', 115000000.00, 116000000.00, 'DL PWD roads 22-23');

-- FY 2023-24 (FiscalYearID=2)
INSERT INTO Budgets (DepartmentID, FiscalYearID, AccountID, FundCode, ApprovedAmount, RevisedAmount, Notes) VALUES
-- AP
(1,  2, 3, 'GF',  99000000.00, 100000000.00, 'AP FIN salaries 23-24'),
(2,  2, 4, 'GF',  69000000.00,  70500000.00, 'AP HLT drugs 23-24'),
(3,  2, 3, 'GF', 115000000.00, 116000000.00, 'AP EDU salaries 23-24'),
(4,  2, 5, 'GF',  84000000.00,  85500000.00, 'AP PWD roads 23-24'),
-- KA
(5,  2, 3, 'GF', 110000000.00, 111500000.00, 'KA FIN salaries 23-24'),
(6,  2, 4, 'GF',  96000000.00,  97000000.00, 'KA HLT drugs 23-24'),
(7,  2, 3, 'GF', 131000000.00, 132000000.00, 'KA EDU salaries 23-24'),
(8,  2, 5, 'GF', 105000000.00, 106000000.00, 'KA PWD roads 23-24'),
-- MH
(9,  2, 3, 'GF', 126000000.00, 127000000.00, 'MH FIN salaries 23-24'),
(10, 2, 4, 'GF', 160000000.00, 161000000.00, 'MH HLT drugs 23-24'),
(11, 2, 3, 'GF', 147000000.00, 148000000.00, 'MH EDU salaries 23-24'),
(12, 2, 5, 'GF', 188000000.00, 189500000.00, 'MH PWD roads 23-24'),
-- TN
(13, 2, 3, 'GF', 116000000.00, 117000000.00, 'TN FIN salaries 23-24'),
(14, 2, 4, 'GF', 107000000.00, 108000000.00, 'TN HLT drugs 23-24'),
(15, 2, 3, 'GF', 142000000.00, 143000000.00, 'TN EDU salaries 23-24'),
(16, 2, 5, 'GF', 148000000.00, 149000000.00, 'TN PWD roads 23-24'),
-- DL
(17, 2, 3, 'GF', 102000000.00, 103000000.00, 'DL FIN salaries 23-24'),
(18, 2, 4, 'GF', 116000000.00, 117000000.00, 'DL HLT drugs 23-24'),
(19, 2, 3, 'GF', 126000000.00, 127000000.00, 'DL EDU salaries 23-24'),
(20, 2, 5, 'GF', 121000000.00, 122000000.00, 'DL PWD roads 23-24');

-- FY 2024-25 (FiscalYearID=3)
INSERT INTO Budgets (DepartmentID, FiscalYearID, AccountID, FundCode, ApprovedAmount, RevisedAmount, Notes) VALUES
-- AP
(1,  3, 3, 'GF', 104000000.00, 105000000.00, 'AP FIN salaries 24-25'),
(2,  3, 4, 'GF',  74000000.00,  75000000.00, 'AP HLT drugs 24-25'),
(3,  3, 3, 'GF', 121000000.00, 122000000.00, 'AP EDU salaries 24-25'),
(4,  3, 5, 'GF',  89000000.00,  90000000.00, 'AP PWD roads 24-25'),
-- KA
(5,  3, 3, 'GF', 116000000.00, 117500000.00, 'KA FIN salaries 24-25'),
(6,  3, 4, 'GF', 102000000.00, 103000000.00, 'KA HLT drugs 24-25'),
(7,  3, 3, 'GF', 138000000.00, 139000000.00, 'KA EDU salaries 24-25'),
(8,  3, 5, 'GF', 112000000.00, 113000000.00, 'KA PWD roads 24-25'),
-- MH
(9,  3, 3, 'GF', 133000000.00, 134000000.00, 'MH FIN salaries 24-25'),
(10, 3, 4, 'GF', 170000000.00, 171000000.00, 'MH HLT drugs 24-25'),
(11, 3, 3, 'GF', 155000000.00, 156000000.00, 'MH EDU salaries 24-25'),
(12, 3, 5, 'GF', 197000000.00, 198500000.00, 'MH PWD roads 24-25'),
-- TN
(13, 3, 3, 'GF', 122000000.00, 123000000.00, 'TN FIN salaries 24-25'),
(14, 3, 4, 'GF', 114000000.00, 115000000.00, 'TN HLT drugs 24-25'),
(15, 3, 3, 'GF', 150000000.00, 151000000.00, 'TN EDU salaries 24-25'),
(16, 3, 5, 'GF', 156000000.00, 157000000.00, 'TN PWD roads 24-25'),
-- DL
(17, 3, 3, 'GF', 107000000.00, 108000000.00, 'DL FIN salaries 24-25'),
(18, 3, 4, 'GF', 122000000.00, 123000000.00, 'DL HLT drugs 24-25'),
(19, 3, 3, 'GF', 132000000.00, 133000000.00, 'DL EDU salaries 24-25'),
(20, 3, 5, 'GF', 127000000.00, 128000000.00, 'DL PWD roads 24-25');

-- Expenditures: seed a few representative transactions per dept per FY (annualized patterns)
-- Use mid-month dates within each FY window to satisfy BEFORE triggers
-- We’ll insert 2–3 transactions per department per FY across Expense/Revenue/Balance sheet to diversify totals

-- FY 2022-23 (FYID=1) sample transactions
INSERT INTO Expenditures (DepartmentID, FiscalYearID, AccountID, ExpenditureDate, Amount, PaymentRef, Description) VALUES
-- AP (1..4) – modest base
(1, 1, 3, '2022-06-25',  8000000.00, 'AP-FIN-JUN-22', 'AP Finance salaries Jun 22'),
(2, 1, 4, '2022-07-15',  6200000.00, 'AP-HLT-JUL-22', 'AP Health drugs Jul 22'),
(3, 1, 3, '2022-09-30', 10000000.00, 'AP-EDU-SEP-22', 'AP Education salaries Sep 22'),
(4, 1, 5, '2022-11-20',  7000000.00, 'AP-PWD-NOV-22', 'AP Road maintenance Nov 22'),
(1, 1, 1, '2022-12-15', 20000000.00, 'AP-REV-SGST-DEC-22', 'AP SGST collection Dec 22'),
(1, 1, 6, '2022-10-22',  1500000.00, 'AP-TRE-CASH-OCT-22', 'AP Treasury cash Oct 22'),

-- KA (5..8) – mid-high base
(5, 1, 3, '2022-06-28',  9000000.00, 'KA-FIN-JUN-22', 'KA Finance salaries Jun 22'),
(6, 1, 4, '2022-07-18',  8200000.00, 'KA-HLT-JUL-22', 'KA Health drugs Jul 22'),
(7, 1, 3, '2022-09-29', 11000000.00, 'KA-EDU-SEP-22', 'KA Education salaries Sep 22'),
(8, 1, 5, '2022-11-19',  8800000.00, 'KA-PWD-NOV-22', 'KA Road maintenance Nov 22'),
(5, 1, 1, '2022-12-16', 26000000.00, 'KA-REV-SGST-DEC-22', 'KA SGST collection Dec 22'),

-- MH (9..12) – high base
(9,  1, 3, '2022-06-26', 10000000.00, 'MH-FIN-JUN-22', 'MH Finance salaries Jun 22'),
(10, 1, 4, '2022-07-12', 13000000.00, 'MH-HLT-JUL-22', 'MH Health drugs Jul 22'),
(11, 1, 3, '2022-09-10', 12000000.00, 'MH-EDU-SEP-22', 'MH Education salaries Sep 22'),
(12, 1, 5, '2022-11-10', 16000000.00, 'MH-PWD-NOV-22', 'MH Road maintenance Nov 22'),
(9,  1, 1, '2022-12-14', 40000000.00, 'MH-REV-SGST-DEC-22', 'MH SGST collection Dec 22'),

-- TN (13..16) – mid-high base
(13, 1, 3, '2022-06-24',  9200000.00, 'TN-FIN-JUN-22', 'TN Finance salaries Jun 22'),
(14, 1, 4, '2022-07-14',  9000000.00, 'TN-HLT-JUL-22', 'TN Health drugs Jul 22'),
(15, 1, 3, '2022-09-12', 11500000.00, 'TN-EDU-SEP-22', 'TN Education salaries Sep 22'),
(16, 1, 5, '2022-11-12', 13000000.00, 'TN-PWD-NOV-22', 'TN Road maintenance Nov 22'),
(13, 1, 1, '2022-12-13', 30000000.00, 'TN-REV-SGST-DEC-22', 'TN SGST collection Dec 22'),

-- DL (17..20) – urban mid-high base
(17, 1, 3, '2022-06-23',  8500000.00, 'DL-FIN-JUN-22', 'DL Finance salaries Jun 22'),
(18, 1, 4, '2022-07-18',  9800000.00, 'DL-HLT-JUL-22', 'DL Health drugs Jul 22'),
(19, 1, 3, '2022-09-29', 10500000.00, 'DL-EDU-SEP-22', 'DL Education salaries Sep 22'),
(20, 1, 5, '2022-11-19', 11000000.00, 'DL-PWD-NOV-22', 'DL Road maintenance Nov 22'),
(17, 1, 1, '2022-12-16', 25000000.00, 'DL-REV-SGST-DEC-22', 'DL SGST collection Dec 22');

-- FY 2023-24 (FYID=2) – uplift by 5–10%
INSERT INTO Expenditures (DepartmentID, FiscalYearID, AccountID, ExpenditureDate, Amount, PaymentRef, Description) VALUES
-- AP
(1, 2, 3, '2023-06-25',  8500000.00, 'AP-FIN-JUN-23', 'AP Finance salaries Jun 23'),
(2, 2, 4, '2023-07-15',  6600000.00, 'AP-HLT-JUL-23', 'AP Health drugs Jul 23'),
(3, 2, 3, '2023-09-30', 10500000.00, 'AP-EDU-SEP-23', 'AP Education salaries Sep 23'),
(4, 2, 5, '2023-11-20',  7300000.00, 'AP-PWD-NOV-23', 'AP Road maintenance Nov 23'),
(1, 2, 1, '2023-12-15', 21500000.00, 'AP-REV-SGST-DEC-23', 'AP SGST collection Dec 23'),

-- KA
(5, 2, 3, '2023-06-28',  9600000.00, 'KA-FIN-JUN-23', 'KA Finance salaries Jun 23'),
(6, 2, 4, '2023-07-18',  8700000.00, 'KA-HLT-JUL-23', 'KA Health drugs Jul 23'),
(7, 2, 3, '2023-09-29', 11600000.00, 'KA-EDU-SEP-23', 'KA Education salaries Sep 23'),
(8, 2, 5, '2023-11-19',  9300000.00, 'KA-PWD-NOV-23', 'KA Road maintenance Nov 23'),
(5, 2, 1, '2023-12-16', 27500000.00, 'KA-REV-SGST-DEC-23', 'KA SGST collection Dec 23'),

-- MH
(9,  2, 3, '2023-06-26', 10600000.00, 'MH-FIN-JUN-23', 'MH Finance salaries Jun 23'),
(10, 2, 4, '2023-07-12', 13800000.00, 'MH-HLT-JUL-23', 'MH Health drugs Jul 23'),
(11, 2, 3, '2023-09-10', 12600000.00, 'MH-EDU-SEP-23', 'MH Education salaries Sep 23'),
(12, 2, 5, '2023-11-10', 16800000.00, 'MH-PWD-NOV-23', 'MH Road maintenance Nov 23'),
(9,  2, 1, '2023-12-14', 43000000.00, 'MH-REV-SGST-DEC-23', 'MH SGST collection Dec 23'),

-- TN
(13, 2, 3, '2023-06-24',  9800000.00, 'TN-FIN-JUN-23', 'TN Finance salaries Jun 23'),
(14, 2, 4, '2023-07-14',  9600000.00, 'TN-HLT-JUL-23', 'TN Health drugs Jul 23'),
(15, 2, 3, '2023-09-12', 12100000.00, 'TN-EDU-SEP-23', 'TN Education salaries Sep 23'),
(16, 2, 5, '2023-11-12', 13800000.00, 'TN-PWD-NOV-23', 'TN Road maintenance Nov 23'),
(13, 2, 1, '2023-12-13', 32000000.00, 'TN-REV-SGST-DEC-23', 'TN SGST collection Dec 23'),

-- DL
(17, 2, 3, '2023-06-23',  9000000.00, 'DL-FIN-JUN-23', 'DL Finance salaries Jun 23'),
(18, 2, 4, '2023-07-18', 10300000.00, 'DL-HLT-JUL-23', 'DL Health drugs Jul 23'),
(19, 2, 3, '2023-09-29', 11100000.00, 'DL-EDU-SEP-23', 'DL Education salaries Sep 23'),
(20, 2, 5, '2023-11-19', 11600000.00, 'DL-PWD-NOV-23', 'DL Road maintenance Nov 23'),
(17, 2, 1, '2023-12-16', 26500000.00, 'DL-REV-SGST-DEC-23', 'DL SGST collection Dec 23');

-- FY 2024-25 (FYID=3) – further uplift
INSERT INTO Expenditures (DepartmentID, FiscalYearID, AccountID, ExpenditureDate, Amount, PaymentRef, Description) VALUES
-- AP
(1, 3, 3, '2024-06-25',  9000000.00, 'AP-FIN-JUN-24', 'AP Finance salaries Jun 24'),
(2, 3, 4, '2024-07-15',  7000000.00, 'AP-HLT-JUL-24', 'AP Health drugs Jul 24'),
(3, 3, 3, '2024-09-30', 11000000.00, 'AP-EDU-SEP-24', 'AP Education salaries Sep 24'),
(4, 3, 5, '2024-11-20',  7600000.00, 'AP-PWD-NOV-24', 'AP Road maintenance Nov 24'),
(1, 3, 1, '2024-12-15', 23000000.00, 'AP-REV-SGST-DEC-24', 'AP SGST collection Dec 24'),

-- KA
(5, 3, 3, '2024-06-28', 10100000.00, 'KA-FIN-JUN-24', 'KA Finance salaries Jun 24'),
(6, 3, 4, '2024-07-18',  9200000.00, 'KA-HLT-JUL-24', 'KA Health drugs Jul 24'),
(7, 3, 3, '2024-09-29', 12200000.00, 'KA-EDU-SEP-24', 'KA Education salaries Sep 24'),
(8, 3, 5, '2024-11-19',  9800000.00, 'KA-PWD-NOV-24', 'KA Road maintenance Nov 24'),
(5, 3, 1, '2024-12-16', 29500000.00, 'KA-REV-SGST-DEC-24', 'KA SGST collection Dec 24'),

-- MH
(9,  3, 3, '2024-06-26', 11200000.00, 'MH-FIN-JUN-24', 'MH Finance salaries Jun 24'),
(10, 3, 4, '2024-07-12', 14500000.00, 'MH-HLT-JUL-24', 'MH Health drugs Jul 24'),
(11, 3, 3, '2024-09-10', 13200000.00, 'MH-EDU-SEP-24', 'MH Education salaries Sep 24'),
(12, 3, 5, '2024-11-10', 17500000.00, 'MH-PWD-NOV-24', 'MH Road maintenance Nov 24'),
(9,  3, 1, '2024-12-14', 46000000.00, 'MH-REV-SGST-DEC-24', 'MH SGST collection Dec 24'),

-- TN
(13, 3, 3, '2024-06-24', 10400000.00, 'TN-FIN-JUN-24', 'TN Finance salaries Jun 24'),
(14, 3, 4, '2024-07-14', 10200000.00, 'TN-HLT-JUL-24', 'TN Health drugs Jul 24'),
(15, 3, 3, '2024-09-12', 12700000.00, 'TN-EDU-SEP-24', 'TN Education salaries Sep 24'),
(16, 3, 5, '2024-11-12', 14500000.00, 'TN-PWD-NOV-24', 'TN Road maintenance Nov 24'),
(13, 3, 1, '2024-12-13', 34000000.00, 'TN-REV-SGST-DEC-24', 'TN SGST collection Dec 24'),

-- DL
(17, 3, 3, '2024-06-23',  9500000.00, 'DL-FIN-JUN-24', 'DL Finance salaries Jun 24'),
(18, 3, 4, '2024-07-18', 10800000.00, 'DL-HLT-JUL-24', 'DL Health drugs Jul 24'),
(19, 3, 3, '2024-09-29', 11700000.00, 'DL-EDU-SEP-24', 'DL Education salaries Sep 24'),
(20, 3, 5, '2024-11-19', 12100000.00, 'DL-PWD-NOV-24', 'DL Road maintenance Nov 24'),
(17, 3, 1, '2024-12-16', 28000000.00, 'DL-REV-SGST-DEC-24', 'DL SGST collection Dec 24');

-- Optional: Backfill yearly totals if triggers were added after data
INSERT INTO DepartmentFiscalYearTotals (DepartmentID, FiscalYearID, AccountType, Total)
SELECT
  e.DepartmentID,
  e.FiscalYearID,
  a.AccountType,
  COALESCE(SUM(e.Amount), 0) AS Total
FROM Expenditures e
JOIN ChartOfAccounts a ON a.AccountID = e.AccountID
GROUP BY e.DepartmentID, e.FiscalYearID, a.AccountType
ON DUPLICATE KEY UPDATE Total = VALUES(Total);
