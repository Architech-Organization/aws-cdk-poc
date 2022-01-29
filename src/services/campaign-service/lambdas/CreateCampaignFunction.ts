import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
/* eslint-disable import/extensions, import/no-absolute-path */
import { object, string, YUP_TEST } from '../../../core/layers/yup-utils/nodejs/yup-utils';

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const PARTITION_KEY = process.env.PARTITION_KEY || '';

const db = new AWS.DynamoDB.DocumentClient();

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
    DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}): Promise<any> => {

    const schema = object().shape({
        name: string().required(),
    });

    if (!event.body) {
        return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
    }

    const payload = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

    const isValid = await schema.isValid({ name: payload.name });
    console.log(`YUP_TEST: ${YUP_TEST} ${event.body.name}`);
    console.log(`isValid: ${isValid}`);
    if (!isValid) {
        return { statusCode: 400, body: 'invalid request body' };
    }


    payload[PRIMARY_KEY] = uuidv4();
    payload[PARTITION_KEY] = payload.campaignType?.toString().toUpperCase() || 'TRANSACTION';
    const params = {
        TableName: TABLE_NAME,
        Item: payload
    };

    try {
        await db.put(params).promise();
        return { statusCode: 201, body: JSON.stringify(payload) };
    } catch (dbError: any) {
        const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
            DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
        return { statusCode: 500, body: errorResponse };
    }
};