#!/bin/bash

npm install
sudo npm -g install bower webpack@beta
npm install css-loader style-loader
bower install
webpack --progress
