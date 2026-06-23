/**
 * Format response sukses
 * @param {object} reply - Fastify reply object
 * @param {*} data - response data
 * @param {object} [meta] - metadata (pagination, etc)
 * @param {number} [statusCode=200]
 */
function success(reply, data, meta = {}, statusCode = 200) {
  return reply.status(statusCode).send({
    success: true,
    data,
    meta,
  });
}

/**
 * Format response error
 * @param {object} reply - Fastify reply object
 * @param {string} error - error message
 * @param {number} [statusCode=500]
 */
function error(reply, error, statusCode = 500) {
  return reply.status(statusCode).send({
    success: false,
    error,
  });
}

module.exports = { success, error };
