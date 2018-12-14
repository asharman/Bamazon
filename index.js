const customerPrompt = require("./bamazonCustomer");
const bamazonManager = require("./bamazonManager");
const inquirer = require("inquirer");

// Ask the user what they would like to sign in as
inquirer
  .prompt([
    {
      type: "list",
      name: "whoAreYou",
      message: "Who would you like to log in as?",
      choices: ["Customer", "Manager"]
    }
  ])
  .then(res => {
    switch (res.whoAreYou) {
      // Based on the choice execute the correct prompt
      case "Customer": {
        customerPrompt();
        break;
      }
      case "Manager": {
        bamazonManager();
        break;
      }
    }
  });
