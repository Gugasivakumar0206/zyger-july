from flask import Flask
from api.invoice_api import invoice_api
from api.sales_dc_api import sales_dc_api
from api.customer_api import customer_api
from api.uom_api import uom_api
from api.bin_api import bin_api
from api.company_info_api import company_api
from api.item_api import item_api
from api.supplier_api import supplier_api
from api.item_group_api import item_group_api
from api.delivery_challan_api import delivery_challan_api
from api.rack_api import rack_api

app = Flask(__name__)

# Register APIs
app.register_blueprint(invoice_api)
app.register_blueprint(sales_dc_api)
app.register_blueprint(customer_api, url_prefix="/api")
app.register_blueprint(uom_api, url_prefix="/api")
app.register_blueprint(bin_api, url_prefix="/api")
app.register_blueprint(company_api, url_prefix="/api")
app.register_blueprint(item_api, url_prefix="/api")
app.register_blueprint(supplier_api, url_prefix="/api")
app.register_blueprint(item_group_api, url_prefix="/api")
app.register_blueprint(delivery_challan_api, url_prefix="/api")
app.register_blueprint(rack_api, url_prefix="/api")

@app.route("/")
def home():
    return "Zyger ERP API Running"


if __name__ == "__main__":
    print(app.url_map)
    app.run(debug=True, port=5000)
