const { Pool } = require("pg");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE users.email = $1`, [email])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

  // let user;
  // for (const userId in users) {
  //   user = users[userId];
  //   if (user.email.toLowerCase() === email.toLowerCase()) {
  //     break;
  //   } else {
  //     user = null;
  //   }
  // }
  // return Promise.resolve(user);
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE users.id = $1`, [id])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(
      `INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;`,
      [user.name, user.email, user.password]
    )
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err);
    });
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return Promise.resolve(
    pool
      .query(
        `SELECT reservations.*, properties.*
      FROM RESERVATIONS
      JOIN users ON reservations.guest_id = users.id
      JOIN properties ON reservations.property_id = properties.id
      WHERE users.id = $1
      LIMIT $2`,
        [guest_id, limit]
      )
      .then((result) => {
        return result.rows;
      })
      .catch((err) => {
        console.log(err);
      })
  );
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];

  // 2
  let queryString = `
   SELECT properties.*, avg(property_reviews.rating) as average_rating
   FROM properties
   JOIN property_reviews ON properties.id = property_id
   `;

  // 3
  let placeholderNumber = 0;
  let isFirstOption = true;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${++placeholderNumber} `;
    isFirstOption = false;
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    if (isFirstOption) {
      queryString += `WHERE owner_id = $${++placeholderNumber} `;
      isFirstOption = false;
    } else {
      queryString += `
    AND owner_id = $${++placeholderNumber} `;
    }
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    if (isFirstOption) {
      queryString += `WHERE owner_id = $${++placeholderNumber} `;
      isFirstOption = false;
    } else {
      queryString += `
    AND owner_id = $${++placeholderNumber} `;
    }
  }

  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    if (isFirstOption) {
      queryString += `WHERE cost_per_night > $${++placeholderNumber} `;
      isFirstOption = false;
    } else {
      queryString += `
    AND cost_per_night > $${++placeholderNumber} `;
    }
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    if (isFirstOption) {
      queryString += `WHERE cost_per_night < $${++placeholderNumber} `;
      isFirstOption = false;
    } else {
      queryString += `
    AND cost_per_night < $${++placeholderNumber} `;
    }
  }

  // 4
  queryString += `
   GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `
    HAVING avg(property_reviews.rating) > $${++placeholderNumber} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
   LIMIT $${queryParams.length};
   `;

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);

  // return Promise.resolve(
  //   pool
  //     .query(`SELECT * FROM properties LIMIT $1`, [limit])
  //     .then((result) => {
  //       return result.rows;
  //     })
  //     .catch((err) => {
  //       console.log(err.message);
  //     })
  // );
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  queryString = `INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  returning *;
  `
  const queryParams = [];
  queryParams.push(property.owner_id);
  queryParams.push(property.title);
  queryParams.push(property.description);
  queryParams.push(property.thumbnail_photo_url);
  queryParams.push(property.cover_photo_url);
  queryParams.push(property.cost_per_night);
  queryParams.push(property.street);
  queryParams.push(property.city);
  queryParams.push(property.province);
  queryParams.push(property.post_code);
  queryParams.push(property.country);
  queryParams.push(property.parking_spaces);
  queryParams.push(property.number_of_bathrooms);
  queryParams.push(property.number_of_bedrooms);

  console.log({queryString, queryParams, property});
  return pool.query(queryString, queryParams).then((res) => res.rows);
};
exports.addProperty = addProperty;
