const jwt = require("jsonwebtoken");
const Document = require("./models/Document");
const User = require("./models/User");
const keys = require("./constants.private");
const socketServer = require("./configFuncs/socketConfig").getSocket();
const SOCKET_ACTIONS = require("../client/src/commonConstants").SOCKET_ACTIONS;
const Room = require("./configFuncs/connectNEDB").Room;

module.exports = (socket) => {
    socket.on(SOCKET_ACTIONS.JOIN_ROOM, async (payload) => {
        try {
            const documentId = payload.document;
            const userId = jwt.verify(payload.token, keys.jwtSecret).user.id;
            const mongoDocument = await Document.findById(documentId);
            
            if (!mongoDocument) {
                socket.emit("error", { message: "Document not found" });
                return;
            }
            
            const user = await User.findById(userId);
            if (!user) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            const { name } = user;

            socket.join(documentId.toString());

            let room = await Room.findOne({ docID: documentId });

            if (room) {
                room.users.push({ userId, name });
                await room.save();
            } else {
                room = new Room();
                room.docID = documentId;
                room.title = mongoDocument.name;
                room.document = mongoDocument.content;
                room.users = [{ userId, name }];
                room.activeUser = null;
                await room.save();
            }
            
            socketServer.to(socket.id).emit(SOCKET_ACTIONS.JOIN_ACCEPTED, {
                newValue: room.document,
                onlineUsers: room.users.map((user) => user.name),
                permission: false,
            });
            
            socket.to(documentId.toString()).emit(SOCKET_ACTIONS.USERS_CHANGED, {
                onlineUsers: room.users.map((user) => user.name),
            });
        } catch (error) {
            console.error("Error in JOIN_ROOM:", error);
            socket.emit("error", { message: "Failed to join room" });
        }
    });

    socket.on(SOCKET_ACTIONS.UPDATE_VALUE, async (payload) => {
        try {
            const room = await Room.findOne({ docID: payload.documentId });
            if (!room) {
                socket.emit("error", { message: "Room not found" });
                return;
            }
            
            const userId = jwt.verify(payload.token, keys.jwtSecret).user.id;
            const user = await User.findById(userId);
            if (!user) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            const { name } = user;
            
            if (name === room.activeUser) {
                room.document = payload.newValue;
                await room.save();
                socket
                    .to(payload.documentId.toString())
                    .emit(SOCKET_ACTIONS.UPDATE_VALUE, {
                        newValue: payload.newValue,
                    });
            }
        } catch (error) {
            console.error("Error in UPDATE_VALUE:", error);
            socket.emit("error", { message: "Failed to update value" });
        }
    });

    socket.on(SOCKET_ACTIONS.UPDATE_NAME, async (payload) => {
        try {
            const document = await Document.findById(payload.document);
            if (!document) {
                socket.emit("error", { message: "Document not found" });
                return;
            }
            
            document.name = payload.newName;
            await document.save();
            
            socketServer
                .in(payload.document.toString())
                .emit(SOCKET_ACTIONS.UPDATE_NAME, {
                    newName: payload.newName,
                });
        } catch (error) {
            console.error("Error in UPDATE_NAME:", error);
            socket.emit("error", { message: "Failed to update name" });
        }
    });

    socket.on(SOCKET_ACTIONS.EDIT_REQUEST, async (payload, callback) => {
        try {
            const userId = jwt.verify(payload.token, keys.jwtSecret).user.id;
            const user = await User.findById(userId);
            if (!user) {
                callback({ permission: false, error: "User not found" });
                return;
            }
            const { name } = user;
            
            const room = await Room.findOne({ docID: payload.documentId });
            if (!room) {
                callback({ permission: false, error: "Room not found" });
                return;
            }

            if (room.activeUser) {
                callback({ permission: false });
            } else {
                room.activeUser = name;
                await room.save();
                callback({ permission: true });
                
                socketServer
                    .in(payload.documentId.toString())
                    .emit(SOCKET_ACTIONS.ACTIVE_CHANGED, {
                        active: name,
                    });
            }
        } catch (error) {
            console.error("Error in EDIT_REQUEST:", error);
            callback({ permission: false, error: "Failed to process edit request" });
        }
    });

    socket.on(SOCKET_ACTIONS.VIEW_REQUEST, async (payload, callback) => {
        try {
            const room = await Room.findOne({ docID: payload.documentId });
            if (!room) {
                callback({ permission: false, error: "Room not found" });
                return;
            }
            
            room.activeUser = null;
            await room.save();
            callback({ permission: true });
            
            socketServer
                .in(payload.documentId.toString())
                .emit(SOCKET_ACTIONS.ACTIVE_CHANGED, {
                    active: null,
                });
        } catch (error) {
            console.error("Error in VIEW_REQUEST:", error);
            callback({ permission: false, error: "Failed to process view request" });
        }
    });
    
    socket.on(SOCKET_ACTIONS.LEAVE_ROOM, async (payload) => {
        try {
            const documentId = payload.document;
            const userId = jwt.verify(payload.token, keys.jwtSecret).user.id;
            const user = await User.findById(userId);
            if (!user) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            const { name } = user;
            
            const room = await Room.findOne({ docID: documentId });
            if (!room) {
                return;
            }

            room.users = room.users.filter((user) => user.userId !== userId);
            
            if (room.activeUser === name) {
                room.activeUser = null;
                socketServer
                    .in(documentId.toString())
                    .emit(SOCKET_ACTIONS.ACTIVE_CHANGED, {
                        active: null,
                    });
            }

            if (room.users.length === 0) {
                const mongoDocument = await Document.findById(documentId);
                if (mongoDocument) {
                    mongoDocument.content = room.document;
                    await mongoDocument.save();
                }
                await room.delete();
            } else {
                await room.save();
                socket
                    .to(documentId.toString())
                    .emit(SOCKET_ACTIONS.USERS_CHANGED, {
                        onlineUsers: room.users.map((user) => user.name),
                    });
            }
        } catch (error) {
            console.error("Error in LEAVE_ROOM:", error);
            socket.emit("error", { message: "Failed to leave room" });
        }
    });
    
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
};
