import { defineBackend } from '@aws-amplify/backend';
import { RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Stack } from 'aws-cdk-lib';
import { calculatorApi } from './functions/calculator-api/resource';

const backend = defineBackend({
  calculatorApi,
});

const lambdaFn = backend.calculatorApi.resources.lambda as LambdaFunction;
const functionStack = Stack.of(lambdaFn);

const historyTable = new Table(functionStack, 'HistoryTable', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

const restApi = new RestApi(functionStack, 'CalculatorRestApi', {
  restApiName: 'calculator-api',
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  },
});

historyTable.grantReadWriteData(lambdaFn);
lambdaFn.addEnvironment('TABLE_NAME', historyTable.tableName);

const integration = new LambdaIntegration(lambdaFn);
const history = restApi.root.addResource('api').addResource('history');
history.addMethod('GET', integration);
history.addMethod('POST', integration);
history.addMethod('DELETE', integration);

backend.addOutput({
  custom: {
    api_url: restApi.url,
  },
});
