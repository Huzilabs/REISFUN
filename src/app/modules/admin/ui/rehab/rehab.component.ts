import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-rehab',
  templateUrl: './rehab.component.html',
  styleUrls: ['./rehab.component.scss']
})
export class RehabComponent implements OnInit {
  rehabForm!: FormGroup;
  values: any = {};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.rehabForm = this.fb.group({
      arv: [],
      squareFeet: [],
      rehabCost: [],
      grossProfit: [],
      holdMonths: [],
      points: [],
      interestRate: [],
      recordingFeeRate: [],
      insurance: [],
      taxes: [],
      utility: [],
      quickSaleDiscount: [],
      closingquickSaleDiscount: [],
      derivative: [],
      taxdiscount: [],
      utilitydiscount: [],
      expectedrehabCosts:[],
      backTaxes: [],
      mowingCosts:[],
      monthlyHoaCost:[],
      otherexpenses:[],

    });

    this.rehabForm.valueChanges.subscribe(() => this.calculate());
  }

  calculate(): void {
    const v = this.rehabForm.value;

    // Base values
    const retailARVPerSqFt = v.squareFeet ? v.arv / v.squareFeet : 0;
    const rehabCostPerSqFt = v.squareFeet ? v.rehabCost / v.squareFeet : 0;

    const salesCommissions = v.arv * (v.quickSaleDiscount / 100);
    const closingCosts = v.arv * (v.closingquickSaleDiscount / 100);

    const holdingCost = v.arv * 0.01 * v.holdMonths;
    const pointsCost = v.arv * (v.points / 100);
    const recordingFees = v.arv * (v.recordingFeeRate / 100);
    const totalHardMoneyCost = pointsCost + holdingCost + recordingFees;







    const insuranceprice = (v.derivative / 12) * v.holdMonths;
    const propertytax = v.taxdiscount * v.holdMonths;
    const utilitycost = v.utilitydiscount * v.holdMonths;

    // ✅ Excel Logic: IF(B21 > 1, B20 - B21, B20 - (B20 * B21))
    let convenienceSalesComission: number;
    if (salesCommissions > 1) {
      convenienceSalesComission = v.arv - salesCommissions;
    } else {
      convenienceSalesComission = v.arv - (v.arv * salesCommissions);
    }
    let convenienceClosingCosts: number;
    if (closingCosts > 1) {
      convenienceClosingCosts = convenienceSalesComission - closingCosts;
    }
    else {
      convenienceClosingCosts = convenienceSalesComission - (convenienceSalesComission * closingCosts);
    }


    const convenienceRehabCosts = convenienceClosingCosts - v.expectedrehabCosts;


    const convenienceInsurance =  convenienceRehabCosts - insuranceprice;


    const convenienceBackTaxes = convenienceInsurance - v.backTaxes;


    const conveniencePropertyTax = convenienceBackTaxes - propertytax;


    const convenienceUtilityCost = conveniencePropertyTax - utilitycost;


    const convenienceMowingCost = convenienceUtilityCost - v.mowingCosts;

    const convenienceHoaCost = convenienceMowingCost - v.monthlyHoaCost;

    const convenienceOtherExpenses = convenienceHoaCost - v.otherexpenses;

      let acquisitionPrice: number;
    if (v.grossProfit > 1) {
      acquisitionPrice = convenienceOtherExpenses - v.grossProfit;
    } else {
      acquisitionPrice = convenienceOtherExpenses - (v.arv *v.grossProfit );
    }



        const acquisitionAfterHM = acquisitionPrice - totalHardMoneyCost;


    // Cost of Hard Money

    const baseLoanAmount = convenienceOtherExpenses;
const hardcostpoints = baseLoanAmount * (v.points / 100);


const monthlyInterestRate = (v.interestRate / 100) / 12;

const holdingcostspermonth = baseLoanAmount * monthlyInterestRate;
const holdingSubtotal = holdingcostspermonth * v.holdMonths;
const totalhardmoneyCost= hardcostpoints +  holdingSubtotal;


const monthlyPoints = hardcostpoints / 12;

const buyPriceBeforeHardMoney = convenienceOtherExpenses;

const check = buyPriceBeforeHardMoney - totalhardmoneyCost;
const expectHoldpointCost = buyPriceBeforeHardMoney * (v.points / 100);
const pointCost = expectHoldpointCost / 12;




const buyPriceAfterHM =
  convenienceOtherExpenses
  - (convenienceOtherExpenses * v.points /100)
  - ((((convenienceOtherExpenses + v.grossProfit) * v.interestRate /100) / 12) * v.holdMonths)
  - v.recordingFeeRate;




    // Store values
    this.values = {
      retailARVPerSqFt,
      rehabCostPerSqFt,
      salesCommissions,
      closingCosts,
      holdingCost,
      pointsCost,
      recordingFees,
      totalHardMoneyCost,
      acquisitionPrice,
      acquisitionAfterHM,
      pointCost,
      check,
      totalhardmoneyCost,
      buyPriceBeforeHardMoney,
      expectHoldpointCost,
      hardcostpoints,
      monthlyPoints,
      baseLoanAmount,
      holdingSubtotal,
      buyPriceAfterHM,
      insuranceprice,
      propertytax,
      utilitycost,
      holdingcostspermonth,
      convenienceSalesComission ,
    convenienceClosingCosts   ,
  convenienceRehabCosts,
  convenienceInsurance,
  convenienceBackTaxes,
  conveniencePropertyTax,
  convenienceUtilityCost,
  convenienceMowingCost,
  convenienceHoaCost,
  convenienceOtherExpenses


};
  }
}
