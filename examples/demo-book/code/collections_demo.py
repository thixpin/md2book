# #region fruits
fruits = ["သရက်", "ငှက်ပျော", "ဒူးရင်း"]
fruits.append("မင်းကွတ်")
for fruit in fruits:
    print(fruit)
# #endregion fruits

# #region prices
prices = {"သရက်": 1500, "ငှက်ပျော": 500}
prices["ဒူးရင်း"] = 12000
for name, price in prices.items():
    print(f"{name}: {price:,} ကျပ်")
# #endregion prices
