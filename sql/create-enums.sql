-- insert specified values for reduction, supervision and semester
INSERT INTO Semester (Name, IsActive) VALUES 
('WS2021', 0),
('SS21', 0),
('WS2122', 0),
('SS22', 0), 
('WS2223', 0), 
('SS23', 0), 
('WS2324', 0), 
('SS24', 1);

INSERT INTO TypeOfSupervision (TypeOfSupervision, CalculationFactor, ValidFrom) VALUES 
('Bachelorarbeit', '0.2', 1), 
('Masterarbeit', '0.2', 1), 
('Zweitprüfer', '0.2', 1), 
('Praxissemester', '0.2', 1),
('Bachelorarbeit', '0.3', 8), 
('Masterarbeit', '0.3', 8), 
('Zweitprüfer', '0.1', 8);

INSERT INTO TypeOfReduction (TypeOfReduction) VALUES 
('Funktion/Aufgabe'), 
('Forschung/Entwicklung'), 
('Behinderung');

INSERT INTO TypeOfLecture (TypeName) VALUES 
('Plattform'), 
('Pflicht'), 
('Wahl');