# Postman API Documentation

This guide provides example requests for testing the Water Quality Monitor API.

**Base URL**: `http://localhost:5000/api`

---

## 1. Authentication

### Register User
`POST /users/register`
```json
{
  "username": "johndoe",
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "phone": "9876543210",
  "location": "New York"
}
```

### Login
`POST /users/login`
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```
*Copy the `token` from the response for subsequent requests.*

---

## 2. Water Stations (Read-Only)

### Get All Stations
`GET /stations`

### Search Stations
`GET /stations/search?q=Bengaluru`

---

## 3. Sensors (Admin - Requires Token)

### Create Sensor
`POST /sensors`
(Auth: Bearer `<token>`)
```json
{
  "sensor_name": "pH Sensor Alpha",
  "sensor_type": "pH",
  "station_id": 1,
  "status": "Active"
}
```

---

## 4. Water Readings (Requires Token)

### Log Reading
`POST /readings`
(Auth: Bearer `<token>`)
```json
{
  "sensor_id": 1,
  "ph_value": 7.2,
  "tds_value": 450,
  "turbidity": 1.5,
  "temperature": 24.5
}
```

---

## 5. Reviews, Likes & Comments (Requires Token)

### Post Review
`POST /reviews`
(Auth: Bearer `<token>`)
```json
{
  "station_id": 1,
  "rating": 5,
  "review_message": "Water quality is excellent here!"
}
```

### Like a Review
`POST /reviews/:id/like`
(Auth: Bearer `<token>`)

### Add Comment
`POST /reviews/:id/comments`
(Auth: Bearer `<token>`)
```json
{
  "comment_text": "I agree, very well maintained."
}
```
