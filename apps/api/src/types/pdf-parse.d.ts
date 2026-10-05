// The package entry point runs a debug harness when required directly; the library
// itself lives in lib/pdf-parse.js and has the same signature.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse = require('pdf-parse');
  export = pdfParse;
}
