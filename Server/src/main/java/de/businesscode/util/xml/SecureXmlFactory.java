package de.businesscode.util.xml;

import java.util.HashMap;
import java.util.Map;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.SAXParserFactory;

/**
 * Factory methods preventing XXE attacks, according to <a href="https://www.owasp.org/index.php/XML_External_Entity_(XXE)_Prevention_Cheat_Sheet#Java">OWASP
 * Cheat Sheet</a>
 */
public abstract class SecureXmlFactory {
  private static final Map<String, Boolean> GENERAL_FACTORY_FEATURES = new HashMap<String, Boolean>() {
    private static final long serialVersionUID = 1L;
    {
      put("http://apache.org/xml/features/disallow-doctype-decl", true);
      put("http://xml.org/sax/features/external-general-entities", false);
      put("http://xml.org/sax/features/external-parameter-entities", false);
      put("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
    }
  };

  /**
   * @return {@link DocumentBuilderFactory} with following options set
   *         <ul>
   *         <li>XInclude: disabled</li>
   *         <li>Validation: disabled</li>
   *         <li>DTD: disabled</li>
   *         <li>External Entities (general+params): disabled</li>
   *         <li>Namespace aware: false</li>
   *         </ul>
   */
  public static DocumentBuilderFactory newDocumentBuilderFactory() {
    final DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

    // apply general features
    GENERAL_FACTORY_FEATURES.forEach((feature, flag) -> {
      try {
        factory.setFeature(feature, flag);
      } catch (Exception e) {
      }
    });

    factory.setXIncludeAware(false);
    factory.setExpandEntityReferences(false);
    factory.setValidating(false);
    factory.setNamespaceAware(false);

    return factory;
  }

  /**
   * @return {@link SAXParserFactory} with following options set
   *         <ul>
   *         <li>XInclude: disabled</li>
   *         <li>Validation: disabled</li>
   *         <li>DTD: disabled</li>
   *         <li>External Entities (general+params): disabled</li>
   *         <li>Namespace aware: false</li>
   *         </ul>
   */
  public static SAXParserFactory newSaxParserFactory() {
    SAXParserFactory factory = SAXParserFactory.newInstance();

    // apply general features
    GENERAL_FACTORY_FEATURES.forEach((feature, flag) -> {
      try {
        factory.setFeature(feature, flag);
      } catch (Exception e) {
      }
    });

    factory.setXIncludeAware(false);
    factory.setValidating(false);
    factory.setNamespaceAware(false);

    return factory;
  }

  /**
   * fluent method to enable namespace awareness
   *
   * @param factory
   * @return
   */
  public static SAXParserFactory enableNamespaceAware(SAXParserFactory factory) {
    factory.setNamespaceAware(true);
    return factory;
  }

  /**
   * fluent method to enable namespace awareness
   *
   * @param factory
   * @return
   */
  public static DocumentBuilderFactory enableNamespaceAware(DocumentBuilderFactory factory) {
    factory.setNamespaceAware(true);
    return factory;
  }

}
