# peri-js

## Dependencies

### node.js (> v4)

#### OSX and linux

`curl -L https://git.io/n-install | bash`

`n stable`

or 

`https://nodejs.org/en/download/`

#### Windows

Directly download installer from https://nodejs.org/en/download/ and use
https://github.com/hakobera/nvmw to manage node version

## Test Installation

`$ node -v`

`$ npm -v`

## Install Libs

`$ npm install yarn -g`
`$ yarn

## Start App

`$ npm start`

## Run test cases
Install mocha if not installed by using
`npm install -g mocha`

Then run test cases as

`mocha --recursive mochaTest`

##### TODO for test

- Aim is to cover all server side functionality using mocha test cases and
  client side using possibly karma or intern
- Mocha Test cases should ensure that all server side functionality i.e /api's
  and all socket handlers work correctly
- It should also ensure that the settings in properties.js points to the correct
  UNIS and all the UNIS end points work correctly


## App Routes

[GUI localhost:42424](http://localhost:42424)

[API localhost:42424/api](http://localhost:42424/api)

## Auth Stuff

- User Should be able to register and login whether there are UNIS instances in cfg.authArr or not
- If there is a UNIS instance in authArr
    - ENABLE_AUTH should also be enabled in UNIS
    - If both conditions are satisfied it should successfully be able to login
      to Unis which can be observed by looking at the result /login in UNIS logs
      or if not able to login then there would be a warning in dlt-web logs as
      well.

- Once logged in each user gets a session cookie from each UNIS instance, this
  cookie is sent by dlt-web for each request in routes
- Now user will get records for which ever records he has attribute certificates
    - Example when ENABLE_AUTH is enabled then user will not get any records
      with field 'secToken : ['<randomGroup>']'
    - All users get a periscope.read permission once logged in, Hence when we
      create a certificate in `/opt/cred` (`ABAC_AUTH_DIR` in settings) which
      maps periscope.read to unis.<randomGroup> , then all records with the
      secToken are also now displayed when we hit `/api/<AnyCollection>`

- So to test we need to first ensure ENABLE_AUTH is set to true in UNIS and have
  records with a specific secToken. Then create a certificate rule for
  appropriate attribute and then first try before login and then after login -
  If it is visible or not.
