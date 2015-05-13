# peri-js

## Dependencies

### node.js (v0.10.28)

#### OSX

if homebrew

`$ brew install node`

else

`$ git clone git://github.com/ry/node.git`

`$ cd node`

`$ ./configure`

`$ make`

`$ make install`

#### Ubuntu

`$ sudo apt-get install g++ curl libssl-dev apache2-utils`

`$ sudo apt-get install git-core`

`$ git clone git://github.com/ry/node.git`

`$ cd node`

`$ ./configure`

`$ make`

`$ make install`

#### Fedora 15

`$ cd /usr/src`

`$ sudo wget http://nodejs.org/dist/v0.10.28/node-v0.10.28.tar.gz`

`$ sudo tar -xvzf node-v0.10.28.tar.gz`

`$ cd node-v0.10.28`

`$ sudo ./configure`

`$ sudo make`

`$ sudo make install`

## Test Installation

`$ node -v`

`$ npm -v`

## Install Libs

`$ npm install`

`$ sudo npm install -g bower`

`$ bower install`

## Start App

`$ npm start`

## Run test cases
Install mocha if not installed by using
`npm install -g mocha`

Then run test cases as

`mocha --recursive mochaTest`

##### TODO for test

- Aim is to cover all server side functionality using mocha test cases and client side using possibly karma or intern
- Mocha Test cases should ensure that all server side functionality i.e /api's and all socket handlers work correctly
- It should also ensure that the settings in properties.js points to the correct UNIS and all the UNIS end points work correctly


## App Routes

[GUI localhost:42424](http://localhost:42424)

[API localhost:42424/api](http://localhost:42424/api)

