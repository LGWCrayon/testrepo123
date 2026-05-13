/// <reference types="node" />
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function ok(body: unknown) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  };
}

function fail(status: number, message: string) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify({ error: message }),
  };
}

interface APIEvent {
  httpMethod: string;
  body?: string | null;
}

export const handler = async (event: APIEvent) => {
  const method = event.httpMethod;

  if (method === 'GET') {
    const { Items = [] } = await dynamo.send(new ScanCommand({ TableName: TABLE }));
    const rows = Items
      .sort((a, b) =>
        new Date(b.created_at as string).getTime() -
        new Date(a.created_at as string).getTime()
      )
      .slice(0, 100);
    return ok(rows);
  }

  if (method === 'POST') {
    const { expression, result } = JSON.parse(event.body ?? '{}');
    if (!expression || result === undefined) {
      return fail(400, 'expression and result are required');
    }
    const id = randomUUID();
    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: { id, expression, result, created_at: new Date().toISOString() },
      })
    );
    return ok({ id });
  }

  if (method === 'DELETE') {
    const { Items = [] } = await dynamo.send(new ScanCommand({ TableName: TABLE }));
    await Promise.all(
      Items.map((item) =>
        dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { id: item.id } }))
      )
    );
    return ok({ ok: true });
  }

  return fail(405, 'Method not allowed');
};
