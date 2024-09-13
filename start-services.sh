#!/bin/bash

servicesPath="./app-services"
denoCommand="deno run dev"

cd "$servicesPath" || exit

$denoCommand