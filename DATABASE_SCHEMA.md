# Smart Home Database Schema

## SQLite/PostgreSQL Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_username ON users(username);
```

### Devices Table
```sql
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id VARCHAR(50) NOT NULL UNIQUE,
  device_name VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  state BOOLEAN DEFAULT 0,
  location VARCHAR(100),
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_device_id ON devices(device_id);
CREATE INDEX idx_user_id ON devices(user_id);
```

### Device History / Logs Table
```sql
CREATE TABLE device_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id VARCHAR(50) NOT NULL,
  user_id INTEGER,
  previous_state BOOLEAN,
  new_state BOOLEAN,
  source VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE INDEX idx_device_logs_device ON device_logs(device_id);
CREATE INDEX idx_device_logs_timestamp ON device_logs(timestamp);
```

### Sessions Table (Optional)
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_token ON sessions(token);
CREATE INDEX idx_user_sessions ON sessions(user_id);
```

## Default Device Setup

Insert default devices:
```sql
-- Assuming user_id 1 exists
INSERT INTO devices (device_id, device_name, device_type, state, location, user_id)
VALUES 
  ('light', 'Bedroom Light', 'light_switch', 0, 'Bedroom', 1),
  ('kitchen', 'Kitchen Light', 'light_switch', 0, 'Kitchen', 1),
  ('fan', 'Living Room Fan', 'fan_control', 0, 'Living Room', 1);
```

## Data Models

### User Object (Python/Node.js)
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2024-02-13T10:30:00Z",
  "is_active": true
}
```

### Device Object
```json
{
  "device_id": "light",
  "device_name": "Bedroom Light",
  "device_type": "light_switch",
  "state": false,
  "location": "Bedroom",
  "last_updated": "2024-02-13T10:35:22Z"
}
```

### Device Log Object
```json
{
  "id": 1,
  "device_id": "light",
  "user_id": 1,
  "previous_state": false,
  "new_state": true,
  "source": "voice",
  "timestamp": "2024-02-13T10:35:22Z"
}
```

## Firebase Alternative (No-SQL)

If using Firebase Realtime Database:

```
/users/
  /{uid}/
    email: string
    username: string
    created_at: timestamp

/devices/
  /{userId}/
    /{deviceId}/
      name: string
      type: string
      state: boolean
      location: string
      updated_at: timestamp

/device_logs/
  /{userId}/
    /{logId}/
      device_id: string
      previous_state: boolean
      new_state: boolean
      source: string
      timestamp: timestamp
```

## Backup and Recovery

Regular backups should be implemented:
```bash
# SQLite backup
sqlite3 smart_home.db ".backup smart_home_backup.db"

# PostgreSQL backup
pg_dump -U postgres smart_home > backup_2024_02_13.sql

# Restore
psql -U postgres smart_home < backup_2024_02_13.sql
```
