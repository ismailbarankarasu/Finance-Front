let array = [10, 20, 30, 40, 50];
let [birinci, ikinci] = array;

let user = {
    fullname: "İsmail Baran KARASU",
    age: 23
}
console.log("birinci: ", birinci);
console.log("ikinci: ", ikinci);
console.log("user: ", user);

let {fullname: elma, age: armut } = user

console.log("fullname: ", elma);
console.log("age: ", armut);

let loginData = {
    username: "",
    password:"",
};

loginData.user = "ismail baran karasu"

loginData = {
    username: "İsmail", 
    password: loginData.password, 
};
console.log(loginData);

console.log("loginData", {...loginData, password: "123"});