const express = require("express");
const bodyparser = require("body-parser");
const path = require("path");
const mysql = require("mysql");
require("dotenv").config();


const app = express();
app.use(express.static(__dirname));
app.use(bodyparser.json());
const port = 6060;
// Create the database connection
const db = mysql.createConnection({
    host: 'baofnqhdacxwufloge9q-mysql.services.clever-cloud.com',
    user: "uxf1dwkow7ootjs3",
    password: "iNkQjTP5ObFSXA6Xw5D3",
    database: "baofnqhdacxwufloge9q",
    port: 3306,
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL database");
});

// Route handlers
app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "payment.html"));
});
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "profile.html"));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
app.get('/maintenance', (req, res) => {
    res.sendFile(path.join(__dirname, "views", "maintenance.html"));
});
app.get("/description/:id", (req, res) => {
    const roomId = req.params.id;
    const query = 'SELECT description FROM Rooms WHERE room_id = ?';
    db.query(query, [roomId], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length > 0) {
            // Return the description if found
            res.json({ id: roomId, description: results[0].description});
        } else {
            // No matching room found
            res.status(404).json({ error: 'Room description not found' });
        }
    });
});
app.post("/roomBooking", (req, res) => {
    const { userId, roomType, checkInDate, checkOutDate, numberOfGuests } = req.body;
    console.log(req.body);

    if (!userId || !roomType || !checkInDate || !checkOutDate || !numberOfGuests) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    const checkRoomAvailabilityQuery = `
        SELECT room_id,price,room_type 
        FROM Rooms 
        WHERE room_type = ? 
        AND availability = 1 
        LIMIT 1;
    `;

    db.query(checkRoomAvailabilityQuery, [roomType], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error checking room availability' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'Sorry, no rooms available for this type.' });
        }

        const availableRoom = results[0];
        console.log(availableRoom)
        const price=availableRoom.price;
        console.log(price);
        const room_type=availableRoom.room_type
        const insertBookingQuery = `
            INSERT INTO Bookings (user_id,room_id,check_in, check_out, num_guests, total_price,room_type)
            VALUES (?, ?, ?, ?, ?,?,?);
        `;

        db.query(insertBookingQuery,[userId,availableRoom.room_id, checkInDate, checkOutDate, numberOfGuests, price,availableRoom.room_type], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error processing the booking' });
            }

            const updateAvailabilityQuery = `
                UPDATE Rooms 
                SET availability = 0 
                WHERE room_id = ?;
            `;
            db.query(updateAvailabilityQuery, [availableRoom.room_id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to update room availability' });
                }
                return res.status(200).json({
                    message: 'Room booking successful!',
                    bookingDetails: { checkInDate, checkOutDate, roomType, numberOfGuests, userId,price,room_type},
                });
            });
        });
    });
});
app.get("/user/booking/payment/:id", (req, res) => {
    const userId = req.params.id; 
    const sql = "SELECT * FROM Bookings WHERE user_id = ?"; 


    db.query(sql, [userId], (err, result) => {
        if (err) {
            
            console.error("Error retrieving booking:", err);
            return res.status(500).json({ message: "Error retrieving booking details." });
        }

        if (result.length === 0) {
            
            return res.status(404).json({ message: "No booking found for this user." });
        }

     
        res.status(200).json({
            message: "Booking details retrieved successfully.",
            booking: result
        });
    });
});


app.post("/newuser/booking", (req, res) => {
    const { name, email, password_hash,phone } = req.body;
    const sql = "INSERT INTO Users (name, email, password_hash,phone) VALUES (?, ?, ?,?)";
    db.query(sql, [name, email, password_hash,phone], (err) => {
        if (err) {
            res.status(500).json({ message: err.message });
        } else {
            res.status(200).json({ message: "User signed up successfully!" });
        }
    });
});

app.post("/login", (req, res) => {
    const { email, pwd } = req.body;

    const sql = "SELECT * FROM Users WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        if (result.length === 0 || result[0].password_hash !== pwd) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = result[0];
        res.status(200).json({
            message: "Login successful!",
            user: { id: user.user_id, name: user.name, email: user.email ,phone :user.phone},
        });
    });
});
app.post('/payment/:id', (req, res) => {
    const userId = req.params.id; // Extract user ID from the request params
    const sql = "UPDATE Bookings SET payment = 'Payment done' WHERE user_id = ?"; // Correct the SQL query syntax

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Error updating payment status:', err);
            return res.status(500).send({ message: 'Failed to update payment status' });
        }
        if (result.affectedRows > 0) {
            res.status(200).send({ message:'Currently in maintenance mode.Payment status is set as "Payment done" but please do not take this seriously. This feature will be available fully in the future. 😉' });
        } else {
            res.status(404).send({ message: 'No booking found for the given user ID' });
        }
    });
});
app.delete('/booking/delete', (req, res) => {
    const { user_id, room_id } = req.body; // Get user_id and room_id from query parameters

    if (!user_id || !room_id) {
        return res.status(400).json({ message: "Missing user_id or room_id." });
    }

    const query = 'DELETE FROM Bookings WHERE user_id = ? AND room_id = ?';

    db.query(query, [user_id, room_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to delete booking." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No booking found for given user_id and room_id." });
        }
        res.status(200).json({ message: "Booking successfully deleted." });
    });
});
app.get('/booking/history/:id', (req, res) => {

    const userId = req.params.id;
    const sql = 'SELECT room_type,created_at,payment FROM Bookings WHERE user_id = ?';
  
    // Execute the query
    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log(results)
      res.json(results);
    });
  });
  
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
