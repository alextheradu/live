// this is for all the helper functions



function craftRequest(code: number, body: object) {
  if (code === 403 || code === 404 || code === 400) {
    return JSON.stringify({
      code: "err",
      message: JSON.stringify(body) || "invalid request",
    });
  } else if (code === 200) {
    return JSON.stringify({
      code: "ok",
      message: JSON.stringify(body) || "success",
    });
  } else if (code === 307) {
    return JSON.stringify({
      code: "ok",
      message: JSON.stringify(body) || "login",
    });
  } else {
    ("code not found");
  }
}


function generateCode() {

    let code = ""; // Initialize code as an empty string
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = 0; i < length; i++) {
        code += String(numbers[Math.floor(Math.random() * numbers.length)]); // Fix off-by-one error
    }

    return code;
}


function isEmail(email: string) {
  let passedTests = true;

  if (email.split("@").length !== 2) {
    passedTests = false;
  } else if (email.length < 4) {
    passedTests = false;
  } else if (email.length > 40) {
    passedTests = false;
  }

  return passedTests;
}

function isPassword(password: string) {
  let passedTests = true;

  if (password.length < 4) {
    passedTests = false;
  } else if (password.length > 15) {
    passedTests = false;
  }

  return passedTests;
}

export {craftRequest, isPassword, isEmail, generateCode}