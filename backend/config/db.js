import mongoose from "mongoose";
import ExamConfig from "../models/ExamConfig.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

const seedDefaultConfigs = async () => {
  try {
    const defaults = [
      {
        examType: "College",
        fields: [
          { key: "roll", label: "Roll No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Department", type: "constraint_1", required: true },
          { key: "sem", label: "Semester", type: "constraint_2", required: true },
          { key: "subject", label: "Subject", type: "subject", required: true }
        ]
      },
      {
        examType: "School",
        fields: [
          { key: "roll", label: "Roll No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Section", type: "constraint_1", required: true },
          { key: "sem", label: "Class", type: "constraint_2", required: true },
          { key: "subject", label: "Subject", type: "subject", required: true }
        ]
      },
      {
        examType: "Competitive",
        fields: [
          { key: "roll", label: "Registration No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Stream", type: "constraint_1", required: true },
          { key: "sem", label: "Subject", type: "constraint_2", required: true }
        ]
      }
    ];

    for (const conf of defaults) {
      await ExamConfig.findOneAndUpdate(
        { examType: conf.examType, orgCode: { $exists: false } },
        { $set: conf },
        { upsert: true, new: true }
      );
    }
    console.log("Default global exam configs verified");
  } catch (error) {
    console.error("Error seeding default exam configs:", error);
  }
};

export const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log("Mongo connected");
    
    await seedDefaultConfigs();
    
    // Seed default superadmin if none exists
    const superadminUsername = process.env.SUPERADMIN_USERNAME || "superadmin";
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || "superadmin123";
    const passwordHash = await bcrypt.hash(superadminPassword, 10);

    const superadmin = await User.findOne({ role: "superadmin" });
    if (!superadmin) {
      const newSuperadmin = new User({
        username: superadminUsername,
        passwordHash,
        role: "superadmin",
        name: "Platform Owner",
        email: "owner@examseatallotment.org",
        phone: "0000000000",
        address: "HQ",
        isApproved: true
      });
      await newSuperadmin.save();
      console.log(`Default superadmin user created: username '${superadminUsername}', password '${superadminPassword}'`);
    } else {
      superadmin.username = superadminUsername;
      superadmin.passwordHash = passwordHash;
      await superadmin.save();
      console.log(`Superadmin credentials synchronized: username '${superadminUsername}'`);
    }
    
    // Legacy migration
    const migrateRes = await Student.updateMany(
      { examType: { $exists: false } }, 
      { $set: { examType: "College" } }
    );
    if (migrateRes.modifiedCount > 0) {
      console.log(`Migrated ${migrateRes.modifiedCount} legacy students to examType "College"`);
    }
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};
