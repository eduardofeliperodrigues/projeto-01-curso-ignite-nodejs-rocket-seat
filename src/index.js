const express = require('express');
const { v4: uuid } = require('uuid')

const app = express();
app.use(express.json());

let customers = [];

/*
  cpf - string
  name - string
  id - uuid
  statement - array
*/


function verifyAccountExists(request, response, next) {
  const { cpf } = request.headers;
  const { description, amount } = request.body;

  const customer = customers.find( 
    (customer) => customer.cpf === cpf
  )

  request.customer = customer;
  request.amount = amount;
  request.description = description;

  if (customer) {
    return next();
  }

  return response.status(404).json({
    error: 'Customer not found'
  })

}

function verifyAccountBalance(request, response, next) {
  const { customer, amount } = request;
  let credit = 0, debt = 0;
  
  const balance = customer.statement.reduce((acumulador, operation) => {
    if (operation.type === 'credit') {
      return acumulador + operation.amount
    }
    return acumulador - operation.amount
  }, 0);

  if (balance >= amount) {
    return next()
  }

  return response.status(401).json({
    error: 'Balance less than withdraw requested'
  })

}

//CREATE ACCOUNT
app.post('/account', (request, response) => {
  const { cpf, name } = request.body;
  const id = uuid()

  const custumerExists = customers.some(
    (customer) => customer.cpf === cpf
  )

  if (custumerExists) {
    return response.status(400).json({
      error: 'This CPF alredy has an account'
    })
  }
  
  customers.push({
    cpf: cpf,
    name: name,
    id: id,
    statement: []
  })

  response.status(201).send();

});

//QUERY STATEMENT
app.get('/statement', verifyAccountExists, (request, response) => {
  const { customer } = request;

  return response.json(
    customer.statement
  )

})

app.post('/deposit', verifyAccountExists, (request, response) => {
  const { customer } = request;
  const { description, amount } = request.body;

  const statement = {
    description: description,
    amount: amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statement);

  response.status(201).json({
    message: 'Deposito feito com sucesso'
  })

});

app.post('/withdraw', verifyAccountExists, verifyAccountBalance, (request, response) => {
  const { customer, description, amount } = request;

  const statement = {
    description: description,
    amount: amount,
    created_at: new Date(),
    type: 'debt'
  }

  customer.statement.push(statement);

  response.status(201).json({
    message: 'Saque feito com sucesso'
  })

});

app.get('/statement/date', verifyAccountExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;
  
  const minDate = new Date(date);
  const baseDate = new Date(date)
  const maxDate = new Date(baseDate.setDate(baseDate.getDate() + 1));

  const statement = customer.statement.filter((statement) => {
    return statement.created_at < maxDate && statement.created_at > minDate
  });

  if (statement.length > 0) {
    return response.json(statement);
  }

  return response.status(404).json({
    message: 'No data for this date'
  })

});

app.put('/account', verifyAccountExists, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  response.status(201).json({
    message: 'Name changed successfuly'
  })

});

app.get('/account', verifyAccountExists, (request, response) => {
  const { customer } = request;

  response.json(customer);

})

app.delete('/account', verifyAccountExists, (request, response) => {
  const { customer } = request;

  customers = customers.filter( (customerArray) => {
    return customerArray.cpf !== customer.cpf;
  });

  response.json({
    message: "Account deleted successfully"
  })

})

app.get('/customers', (request, response) => {
  response.json(customers);
});

app.listen(8080, () => {
  console.log('Server running on port 8080');
});