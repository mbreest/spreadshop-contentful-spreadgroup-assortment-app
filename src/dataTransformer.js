/**
 * Transforms the product type API response into
 * the product schema expected by the SkuPicker component
 */
export const dataTransformer = projectUrl => product => {
  console.log(product);
  const { id, name, href, resources } = product;
  const image = resources[0].href;  
  const sku = id;
  return {
    id,
    image,
    name,
    sku,
    externalLink: href
  };
};
