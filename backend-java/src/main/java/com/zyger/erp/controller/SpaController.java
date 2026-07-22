package com.zyger.erp.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {
    @RequestMapping(value = {
        "/dashboard", "/master/**", "/inventory/**", "/planning/**", "/process/**",
        "/crm/**", "/sales/**", "/invoice/**", "/purchase/**", "/quality/**",
        "/subcontractor/**", "/settings/**", "/company-info", "/reports/**"
    }, headers = "Accept=text/html")
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}