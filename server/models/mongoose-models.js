"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentSchema = exports.CompanyCodeModel = exports.ClientModel = exports.LogModel = exports.DocumentModel = exports.UserModel = exports.Counter = void 0;
exports.getNextSequence = getNextSequence;
var mongoose_1 = require("mongoose");
var userSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ["superadmin", "admin", "viewer"], default: "viewer" },
    clientId: { type: Number, default: null },
    lastLogin: { type: Date, default: null },
    sessionExpiry: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    legacyId: { type: Number, unique: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
});
var documentSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    path: { type: String, required: true },
    revision: { type: String, required: true },
    driveUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    alertStatus: { type: String, default: "none" },
    expiryDate: { type: Date, default: null },
    parentId: { type: Number, default: null },
    isObsolete: { type: Boolean, default: false },
    fileHash: { type: String, default: null },
    encryptedCachePath: { type: String, default: null },
    clientId: { type: Number, default: null },
    ownerId: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    legacyId: { type: Number, unique: true },
    googleFileId: { type: String, index: true, unique: true, sparse: true },
});
exports.documentSchema = documentSchema;
var logSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true },
    userId: { type: Number, required: true },
    action: { type: String, required: true },
    documentId: { type: Number, default: null },
    details: { type: mongoose_1.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
    legacyId: { type: Number, unique: true },
});
var counterSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
exports.Counter = mongoose_1.default.model("Counter", counterSchema);
// Function to get the next sequence value
function getNextSequence(name) {
    return __awaiter(this, void 0, void 0, function () {
        var counter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true })];
                case 1:
                    counter = _a.sent();
                    return [2 /*return*/, counter.seq];
            }
        });
    });
}
var clientSchema = new mongoose_1.default.Schema({
    id: { type: Number, required: true, unique: true },
    legacyId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    driveFolderId: { type: String, required: true },
    google: {
        accessToken: { type: String, required: false },
        refreshToken: { type: String, required: false },
        expiryDate: { type: Number, required: false },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
var companyCodeSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    role: { type: String, required: true, default: "admin" },
    usageLimit: { type: Number, default: 1 },
    usageCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    legacyId: { type: Number, unique: true, sparse: true },
});
// Create models
exports.UserModel = mongoose_1.default.model("User", userSchema);
exports.DocumentModel = mongoose_1.default.model("Document", documentSchema);
exports.LogModel = mongoose_1.default.model("Log", logSchema);
exports.ClientModel = mongoose_1.default.model("Client", clientSchema);
exports.CompanyCodeModel = mongoose_1.default.model("CompanyCode", companyCodeSchema);
