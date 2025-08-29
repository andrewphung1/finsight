-- Create sample portfolio data for demonstration
-- This script inserts realistic sample transactions to showcase the platform

-- Sample transactions for a diversified portfolio
INSERT INTO transactions (id, user_id, ticker, transaction_date, quantity, price, transaction_type) VALUES
-- Apple positions
('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM auth.users LIMIT 1), 'AAPL', '2023-01-15', 50, 150.00, 'BUY'),
('550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM auth.users LIMIT 1), 'AAPL', '2023-06-20', 25, 185.50, 'BUY'),
('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM auth.users LIMIT 1), 'AAPL', '2023-11-10', 10, 190.25, 'SELL'),

-- Microsoft positions
('550e8400-e29b-41d4-a716-446655440004', (SELECT id FROM auth.users LIMIT 1), 'MSFT', '2023-02-01', 30, 250.75, 'BUY'),
('550e8400-e29b-41d4-a716-446655440005', (SELECT id FROM auth.users LIMIT 1), 'MSFT', '2023-08-15', 20, 320.40, 'BUY'),

-- Google positions
('550e8400-e29b-41d4-a716-446655440006', (SELECT id FROM auth.users LIMIT 1), 'GOOGL', '2023-03-10', 15, 95.20, 'BUY'),
('550e8400-e29b-41d4-a716-446655440007', (SELECT id FROM auth.users LIMIT 1), 'GOOGL', '2023-09-05', 10, 125.80, 'BUY'),

-- Amazon positions
('550e8400-e29b-41d4-a716-446655440008', (SELECT id FROM auth.users LIMIT 1), 'AMZN', '2023-04-20', 20, 105.30, 'BUY'),
('550e8400-e29b-41d4-a716-446655440009', (SELECT id FROM auth.users LIMIT 1), 'AMZN', '2023-10-12', 15, 140.75, 'BUY'),

-- Tesla positions
('550e8400-e29b-41d4-a716-446655440010', (SELECT id FROM auth.users LIMIT 1), 'TSLA', '2023-05-08', 25, 180.45, 'BUY'),
('550e8400-e29b-41d4-a716-446655440011', (SELECT id FROM auth.users LIMIT 1), 'TSLA', '2023-07-22', 15, 260.90, 'BUY'),
('550e8400-e29b-41d4-a716-446655440012', (SELECT id FROM auth.users LIMIT 1), 'TSLA', '2023-12-01', 20, 240.15, 'SELL'),

-- NVIDIA positions
('550e8400-e29b-41d4-a716-446655440013', (SELECT id FROM auth.users LIMIT 1), 'NVDA', '2023-06-01', 12, 380.25, 'BUY'),
('550e8400-e29b-41d4-a716-446655440014', (SELECT id FROM auth.users LIMIT 1), 'NVDA', '2023-11-15', 8, 450.80, 'BUY');
