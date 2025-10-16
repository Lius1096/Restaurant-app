// utils/orderStatusTransitions.js

const allowedStatusTransitions = {
  pending: ['modified', 'confirmed', 'cancelled'],      
  modified: ['confirmed', 'cancelled'],               
  confirmed: ['preparing', 'cancelled'],              
  preparing: ['ready', 'cancelled'],                  
  ready: ['completed', 'cancelled'],                  
  completed: [],                                      
  cancelled: []                                       
};

module.exports = allowedStatusTransitions;
