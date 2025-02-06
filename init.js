// index.js
const express = require('express');
const xmlparser = require('express-xml-bodyparser');
const { create } = require('xmlbuilder2');

const app = express();
const port = 3000;

// Middleware to parse XML bodies
app.use(xmlparser());

// POST endpoint to receive XML requests
app.post('/api/xml', (req, res) => {
    // The XML body will be available on req.body.
    // With express-xml-bodyparser, each XML element becomes a property,
    // and nested elements become arrays.

    // Check if the root element is "request"
    if (!req.body || !req.body.request) {
        return sendErrorResponse(res, 'Missing <request> element');
    }

    const requestData = req.body.request;

    // Validate the <control> section
    if (!requestData.control || !Array.isArray(requestData.control) || !requestData.control[0]) {
        return sendErrorResponse(res, 'Missing <control> element');
    }

    const control = requestData.control[0];

    // Required control fields: senderid, password, controlid, uniqueid, dtdversion, includewhitespace
    const requiredControlFields = ['senderid', 'password', 'controlid', 'uniqueid', 'dtdversion', 'includewhitespace'];
    for (const field of requiredControlFields) {
        if (!control[field] || !Array.isArray(control[field]) || control[field][0] === undefined) {
            return sendErrorResponse(res, `Missing or invalid <${field}> in <control>`);
        }
    }

    // Validate the <operation> section
    if (!requestData.operation || !Array.isArray(requestData.operation) || !requestData.operation[0]) {
        return sendErrorResponse(res, 'Missing <operation> element');
    }

    const operation = requestData.operation[0];

    // Validate the <authentication> inside <operation>
    if (!operation.authentication || !Array.isArray(operation.authentication) || !operation.authentication[0]) {
        return sendErrorResponse(res, 'Missing <authentication> element');
    }
    const auth = operation.authentication[0];
    if (
        (!auth.sessionid || !Array.isArray(auth.sessionid) || auth.sessionid[0] === undefined) &&
        (!auth.login || !Array.isArray(auth.login) || auth.login.length === 0 ||
        !auth.login[0].userid || !Array.isArray(auth.login[0].userid) ||
        !auth.login[0].companyid || !Array.isArray(auth.login[0].companyid) ||
        !auth.login[0].password || !Array.isArray(auth.login[0].password))
    ) {
        return sendErrorResponse(res, 'Missing or invalid <sessionid> in <authentication>');
    }

    // Validate the <content> inside <operation>
    if (!operation.content || !Array.isArray(operation.content) || !operation.content[0]) {
        return sendErrorResponse(res, 'Missing <content> element');
    }
    const content = operation.content[0];

    // Validate the <function> inside <content> (with an attribute controlid)
    if (!content.function || !Array.isArray(content.function) || !content.function[0]) {
        return sendErrorResponse(res, 'Missing <function> element');
    }
    const func = content.function[0];
    console.log("Parsed function element:", func);
    
    if (
        (!func.getapisession || !Array.isArray(func.getapisession) || func.getapisession[0]) &&
        (!func.readbyname || !Array.isArray(func.readbyname) || !func.readbyname[0]) &&
        (!func.create || !Array.isArray(func.create) || !func.create[0])
    ) {
        console.error("Function element is missing or in an unexpected format:", func);
        return sendErrorResponse(res, 'Missing <getapisession>, <readbyname>, or <create> element in <function>');
    }
    if (!func.$ || !func.$.controlid) {
        return sendErrorResponse(res, 'Missing controlid attribute in <function>');
    }

    // Validate <readbyname> if present
    if (func.readbyname && Array.isArray(func.readbyname) && func.readbyname[0]) {
        const readbyname = func.readbyname[0];
        if (
            !readbyname.object || !Array.isArray(readbyname.object) || readbyname.object[0] === undefined ||
            !readbyname.keys || !Array.isArray(readbyname.keys) || readbyname.keys[0] === undefined ||
            !readbyname.fields || !Array.isArray(readbyname.fields) || !readbyname.fields[0] === undefined
        ) {
            return sendErrorResponse(res, 'Missing required fields in <readbyname>: object, keys, or fields');
        }
    }
    
    // Validate <getapisession> if present
    if (func.getapisession && Array.isArray(func.getapisession) && func.getapisession[0]) {
            return sendErrorResponse(res, '<getapisession> should be a tag without fields');
    }
    
    // Validate <create> if present
    if (func.create && Array.isArray(func.create) && func.create[0]) {
        const create = func.create[0];
        // TODO
    }

    // At this point, we assume that the incoming XML is valid.
    // For demonstration, we will return a fake response in XML format.
    // In a real-world application, you might perform additional business logic here.

    const fakeCustomerID = 'CUST-12345';
    const fakeResponse = {
        response: {
            status: 'success',
            message: 'Request processed successfully',
            data: {
                CUSTOMER: {
                    CUSTOMERID: fakeCustomerID,
                    // You could add additional fake fields here if needed.
                }
            }
        }
    };

    // Create XML response using xmlbuilder2
    const xmlResponse = create({ version: '1.0', encoding: 'UTF-8' })
        .ele(fakeResponse)
        .end({ prettyPrint: true });

    // Set the content-type header and send the response
    res.set('Content-Type', 'application/xml');
    res.send(xmlResponse);
});

// Helper function to send an error response in XML format
function sendErrorResponse(res, errorMessage) {
    const errorResponse = {
        response: {
            status: 'error',
            message: errorMessage
        }
    };

    const xmlError = create({ version: '1.0', encoding: 'UTF-8' })
        .ele(errorResponse)
        .end({ prettyPrint: true });

    res.status(400).set('Content-Type', 'application/xml').send(xmlError);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
