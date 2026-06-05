const User = require("../database/models/User.js");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const findByEmail = (email) => {
  return User.findOne({ email });
};

const findById = (id, fields) => {
  const opts = {};

  for (let field of fields) {
    opts[field] = 1;
  }

  return User.findById(id, opts);
}

const validatePassword = (plaintext, hash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plaintext, hash, (err, result) => {
      if (err) {
        err.code = "PASSWORD_HASH_ERROR";
        return reject(err);
      }
      resolve(result);
    });
  });
};

const createUser = ({ username, email, password }) => {
  return User.create({ username, email, password });
};

const deleteUserById = async (id) => {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const opts = { session };

    const activeUserCount = await User.countDocuments({}, opts);

    if (activeUserCount <= 1) {
      const error = new Error();
      error.code = "CANNOT_DELETE_LAST_ADMIN";
      throw error;
    }

    const result = await User.deleteOne({ _id: id }, opts);

    if (result.deletedCount === 0) {
      const error = new Error();
      error.code = "NOT_FOUND";
      throw error;
    }

    await session.commitTransaction();

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    if (error?.code === "CANNOT_DELETE_LAST_ADMIN" || error?.code === "NOT_FOUND") {
      throw error;
    }

    if (error.name === "CastError") {
      const err = new Error();
      err.code = "INVALID_ID";
      throw err;
    }

    console.error(`User delete: ${id}`, error);
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }

};

module.exports = { findByEmail, validatePassword, createUser, deleteUserById, findById };
