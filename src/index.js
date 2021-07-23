import difference from 'lodash/difference';

import { setup, renderSkuPicker } from '@contentful/ecommerce-app-base';

import logo from './logo.svg';
import { dataTransformer } from './dataTransformer';

const DIALOG_ID = 'root';
const PER_PAGE = 20;

function makeCTA(fieldType) {
  return fieldType === 'Array' ? 'Select products' : 'Select a product';
}

function validateParameters(parameters) {
  if (parameters.shopId.length < 1) {
    return 'Provide a Spreadgroup shop id.';
  }

  if (parameters.apiKey.length < 1) {
    return 'Provide a Spreadgroup api key.';
  }

  return null;
}

async function fetchSKUs(installationParams, search, pagination) {  
  const validationError = validateParameters(installationParams);
  if (validationError) {
    throw new Error(validationError);
  }

  const { shopId, apiKey } = installationParams;

  const URL = `https://api.spreadshirt.net/api/v1/shops/${shopId}/productTypes?limit=${PER_PAGE}&offset=${pagination.offset}&mediaType=json&apiKey=${apiKey}`;

  const res = await fetch(URL, { method: 'GET' });

  return await res.json();
}

const fetchProductPreviews = async function fetchProductPreviews(skus, config) {
  if (!skus.length) {
    return [];
  }

  const { shopId, apiKey } = config;

  const resultPromises = skus.map(async sku => {
    const URL = `https://api.spreadshirt.net/api/v1/shops/${shopId}/productTypes/${sku}?mediaType=json&apiKey=${apiKey}`;
    const res = await fetch(URL, { method: 'GET' });
    return await res.json();
  });

  const results = await Promise.all(resultPromises);

  const foundProducts = results.map(dataTransformer());  

  console.log(foundProducts);

  const missingProducts = difference(
    skus,
    foundProducts.map(product => product.sku)
  ).map(sku => ({ sku, isMissing: true, image: '', name: '', id: '' }));

  return [...foundProducts, ...missingProducts];
};

async function renderDialog(sdk) {
  const container = document.getElementById(DIALOG_ID);
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  renderSkuPicker(DIALOG_ID, {
    sdk,
    fetchProductPreviews,
    fetchProducts: async (search, pagination) => {
      const result = await fetchSKUs(sdk.parameters.installation, search, pagination);
  
      return {
        pagination: {
          count: PER_PAGE,
          limit: PER_PAGE,
          total: result.count,
          offset: pagination.offset
        },
        products: result.productTypes.map(dataTransformer())
      };
    }
  });

  sdk.window.startAutoResizer();
}

async function openDialog(sdk, currentValue, config) {
  const skus = await sdk.dialogs.openCurrentApp({
    allowHeightOverflow: true,
    position: 'center',
    title: makeCTA(sdk.field.type),
    shouldCloseOnOverlayClick: true,
    shouldCloseOnEscapePress: true,
    parameters: config,
    width: 1400
  });

  return Array.isArray(skus) ? skus : [];
}

function isDisabled(/* currentValue, config */) {
  // No restrictions need to be imposed as to when the field is disabled from the app's side
  return false;
}

setup({
  makeCTA,
  name: 'Spreadgroup Assortment',
  logo,
  description:
    'The Spreadgroup assortment app allows to pick product types from the Spreadgroup assortment.',
  color: '#212F3F',
  parameterDefinitions: [
    {
      id: 'shopId',
      name: 'Shop Id',
      description: 'The shop Id',
      type: 'Symbol',
      required: true
    },
    {
      id: 'apiKey',
      name: 'API Key',
      description: 'The api key',
      type: 'Symbol',
      required: true
    }
  ],
  fetchProductPreviews,
  renderDialog,
  openDialog,
  isDisabled,
  validateParameters
});
