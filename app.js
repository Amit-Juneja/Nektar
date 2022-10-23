const http = require("http");
const url = require("url");
const fs = require('fs');

/**
 * Below constant is defined to run the server on the given PORT number
 */
const PORT = 3031;

/**
 * Below constant is defined because it is the maximum size of the response which can be sent
 */
const maxSize = 5000000;

/**
 * Below constant is defined to provide name of the file which needs to processed for logs
 */

const fileName = './example.txt'

/**
 * Below method is used to create a request listener
 * @param {*} req 
 * @param {*} res 
 */
const requestListener = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  const parsed = url.parse(req.url, true)
  const reqUrl = parsed?.pathname

  if (req.method === "GET") {
    /**
    * Below condition is the route which gets displayed when the request is hit on the baseURL
    */
    if (reqUrl === "/") {
      res.write(`Please do a GET request on this link: http://localhost:${PORT}/fetchLogs. 
      Also send the time stamps inside the body within which you would like to filter the log file as shown below:
      {
        start_time: "2020-01-05",
        end_time: "2020-01-17"
      }`)
      res.end();
    }

    /**
     * Below condition is the route which gets displayed when the request is hit on the fetchLogs URL
     */
    else if (reqUrl === "/fetchLogs") {
      const readStream = fs.createReadStream(fileName);

      /**
       * Started an event listener when the request arrives at the given route
       */
      req.on('data', request_chunk => {
        const data = JSON.parse(Buffer.from(request_chunk, 'utf8').toString());
        const startDate = (data?.start_time)?.toString();
        const endDate = (data?.end_time)?.toString();
        let size = 0;

        const isStartDateNan = Date.parse(startDate)
        const isEndDateNan = Date.parse(endDate)

        /**
         * If the response format is incorrect which is if it doesn't follow the format YYYY:MM:DDTxx:yy:zz.wwwZ or YYYY:MM:DD...
         * the below condition will handle such inputs
         */
        if (isNaN(isStartDateNan) || isNaN(isEndDateNan)) {
          res.write("The request body format is incorrect")
          res.end();
          req.destroy();
          return;
        }

        const startingDate = new Date(startDate).getTime()
        const endingDate = new Date(endDate).getTime()

        /**
         * Started a read stream on the file
         */
        readStream
          /**
           * Below event gets trigerred when the stream starts processing the data which is being sent in the request
           */
          .on('data', (readStream_chunk) => {
            try {
              // size = size + readStream_chunk.length;

              /**
               * If the size of the response exceeds the maximum size of the response then stop the stream & return the response
               */
              if (size > maxSize) {
                res.write('\n Resource size exceeds limit (' + size + ')')
                res.end();
                readStream.destroy();
              }

              /**
               * return the response for the matched timestamps on the basis of filtering the file for the given timestamps
               */
              else {
                const result = Buffer.from(readStream_chunk, 'utf8').toString();
                const inputArray = result.split('\n');
                inputArray.filter(function (rowString) {
                  const tabPointer = rowString.indexOf('\t');
                  const rowStringPointer = rowString.indexOf(' ', tabPointer + 1);
                  const processedLogStream = new Date(rowString.slice(tabPointer + 1, rowStringPointer));

                  if (processedLogStream <= endingDate && processedLogStream >= startingDate) {
                    size = size + rowString.length;
                    res.write(rowString)
                  }
                  return rowString;
                });
              }
            }
            /**
             * Display the stack trace of the error if any of the above calls throw an error
             */
            catch (error) {
              console.error(error)
            }
          })
          /**
           * Below handling is added when there is an error in the stream
           */
          .on('error', (errMsg) => {
            console.error(errMsg);
            res.end(errMsg);
          })
          /**
           * Below event is triggered when the stream ends gracefully
           */
          .on('end', () => {
            res.end();
          })
          /**
           * Below event is trigerred when the stream closes
           */
          .on("close", () => {
            console.info("Stream has been destroyed and file has been closed");
          });
      })
    }
  }
}


/**
 * Create an http server
 */
const server = http.createServer(requestListener);

/**
 *  Server is listening on PORT added in the constant variable
 */
server.listen(PORT, () => {
  console.log("Server listening on PORT =>: ", PORT)
});