var settings = require('./settings.json');

// Calculate amortization
for (var l = 0; l < settings.loans.length; l++) {
    var loan = settings.loans[l];
    loan.comparisonYears = settings.comparisonYears;
    loan.amount = settings.loanAmount;

    settings.loans[l] = calculateAmortization(loan);
    
    settings.highestPayment = Math.max(settings.highestPayment || 0, settings.loans[l].payment);
}

console.log(`Based on a monthly budget of $${Math.round(settings.highestPayment*100)/100}\n`);


for (var i = 0; i < settings.investments.length; i++) {
    var investment = settings.investments[i];
    console.log('### Investment Rate: ' + investment.rate + '% ###');
    
    for (var l = 0; l < settings.loans.length; l++) {
        var loan = settings.loans[l];
        var result = calculateBalance(
                loan,
                investment,
                settings.marginalTaxRate);
    
        console.log(`  ${l+1}. ${loan.term} Years at ${loan.rate}%, Investment at ${investment.rate}%, Payment of ${Math.round(loan.payment*100)/100}`);
        if (result.house) console.log(`    $${Math.round(result.house)} - House`)
        if (result.lowerPaymentsInterest) console.log(`    $${Math.round(result.lowerPaymentsInterest)} - Lower Payments`)
        if (result.paidOffEarlyInterest) console.log(`    $${Math.round(result.paidOffEarlyInterest)} - Paid Off Early`)
        if (result.loanInterest) console.log(`    $${Math.round(result.loanInterest)} - Interest`)
        if (result.unpaidLoan) console.log(`    $${Math.round(result.unpaidLoan)} - Remaining Loan`)
        console.log(`    -------------`)
        console.log(`    $${Math.round(result.balance)}`)
        console.log();
    }
    
    console.log();
}

function calculateBalance(loan, investment, taxRate) {
    var result = {
        house: settings.includePrincipalAsDebt ? -1 * loan.amount : 0,
        lowerPaymentsInterest: 0,
        loanInterest: 0,
        unpaidLoan: 0,
        paidOffEarlyInterest: 0
    }
    
    var months = settings.comparisonYears * 12;
    
    // Continuous investment
    var cInvest = settings.highestPayment - loan.payment;
    result.lowerPaymentsInterest += compoundInterest(0, cInvest, investment.rate / 100 / 12, months);
    
    // Loan amortization
    var pv = loan.amortization[months] || loan.amortization[loan.amortization.length-1];
    result.loanInterest -= pv.interest;
    result.unpaidLoan -= pv.balance
    
    // Investment after loan
    var extraMonths = months - (loan.amortization.length-1);
    if (extraMonths > 0){
        var aInvest = loan.payment;
        result.paidOffEarlyInterest += compoundInterest(0, aInvest, investment.rate / 100 / 12, extraMonths);
    }
    
    result.balance = result.house + result.lowerPaymentsInterest + result.loanInterest + result.unpaidLoan + result.paidOffEarlyInterest;
    
    return result;
}

function calculateAmortization(loan) {
    loan.months = loan.term * 12;
    loan.mRate = loan.rate / 100 / 12;
    
    loan.payment = loanPayment(loan.mRate, loan.amount, loan.months);
    
    var a = [];
    a[0] = {};
    a[0].balance = loan.amount;
    a[0].interest = loan.amount;
    a[0].equity = 0;
    
    for (var i = 1; i <= loan.months; i++) {
        var mInterest = a[i-1].balance * loan.mRate;
        a[i] = {};
        a[i].balance = a[i-1].balance + mInterest - loan.payment;
        a[i].interest = a[i-1].interest + mInterest;
        a[i].equity = a[i-1].equity + loan.payment - mInterest;
    }
    
    loan.amortization = a;
    
    return loan;
}

function loanPayment(ratePerPeriod, presentValue, periods) {
    return (ratePerPeriod * presentValue) / (1 - Math.pow(1 + ratePerPeriod, -periods));
}

function compoundInterest(principal, contribution, ratePerPeriod, periods) {
    var initial = principal * (1 + ratePerPeriod) ^ periods;
    var futureValue = contribution * ((Math.pow(1 + ratePerPeriod, periods) - 1) / (ratePerPeriod));
    return initial + futureValue;
}