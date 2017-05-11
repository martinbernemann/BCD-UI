/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
package de.businesscode.util;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.io.Writer;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.URL;
import java.util.Calendar;
import java.util.Enumeration;
import java.util.Locale;
import java.util.UUID;
import java.util.jar.Attributes;
import java.util.jar.JarFile;
import java.util.jar.Manifest;

import javax.servlet.ServletInputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.TransformerFactoryConfigurationError;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stax.StAXResult;
import javax.xml.transform.stream.StreamResult;

import org.apache.commons.codec.digest.DigestUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

public class Utils {
  private static String bcduiVersion;
  /**
   * custom session id http servlet request attribute name, see {@link #getSessionId(HttpServletRequest, boolean)}
   */
  private static String REQUEST_ATTR_CUSTOM_SESSION_ID = "bcdCustomSessionId";

  /**
   * privides the default Calendar object with preset GERMAN locale.
   *
   * @param lang
   * @return
   */
  public static Calendar getDefaultCalendar(Locale lang) {
    return Calendar.getInstance(Locale.GERMAN);
  }

  public static void injectDOMContentInXMLStreamWriter(XMLStreamWriter writer, Node node) throws TransformerException {
    if (node != null && node.getNodeType() == Node.ELEMENT_NODE) {
      TransformerFactory.newInstance().newTransformer().transform(new DOMSource(node), new StAXResult(generateUnClosableWriter(writer)));
    }
  }

  /**
   * puts the provided XMLStreamWriter into uncloseable wrap so that the writeStartDocument and writeEndDocument events are ignored,
   * additionally it implements xmlns-awareness and propagate to setDefaultNamespace() if "xmlns" prefix is set for an element
   *
   * @param source
   * @return XMLStreamWriter wrapping the sources
   */
  public static XMLStreamWriter generateUnClosableWriter(final XMLStreamWriter source) {
    return (XMLStreamWriter) Proxy.newProxyInstance(XMLStreamWriter.class.getClassLoader(), new Class[] { XMLStreamWriter.class }, new InvocationHandler() {
      @Override
      public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.getName().equals("writeStartDocument") || method.getName().equals("writeEndDocument"))
          return null;
          if("setPrefix".equals(method.getName()) && args != null && args.length==2 && "xmlns".equals(args[0])){
            return method.getDeclaringClass().getMethod("setDefaultNamespace", String.class).invoke(source, args[1]);
          }
        return method.invoke(source, args);
      }
    });
  }

  /**
   *
   * serializes a Node to string
   *
   * @param element
   *          a w3c.Node
   * @return
   * @throws TransformerFactoryConfigurationError
   * @throws TransformerException
   * @throws TransformerConfigurationException
   */
  public static String serializeElement(Element element) throws TransformerConfigurationException, TransformerException, TransformerFactoryConfigurationError {
    StringWriter writer = new StringWriter();
    TransformerFactory.newInstance().newTransformer().transform(new DOMSource(element), new StreamResult(writer));
    return writer.toString();
  }

  /**
   * creates {@link XMLStreamWriter} for given stream
   *
   * @param os
   * @return
   * @throws RuntimeException
   */
  public static XMLStreamWriter createStreamWriter(OutputStream os){
    try {
      return XMLOutputFactory.newInstance().createXMLStreamWriter(os);
    } catch (Exception e) {
      throw new RuntimeException("failed to create xml stream writer", e);
    }
  }

  /**
   * creates {@link XMLStreamWriter} for given stream
   *
   * @param w
   * @return
   * @throws RuntimeException
   */
  public static XMLStreamWriter createStreamWriter(Writer w){
    try {
      return XMLOutputFactory.newInstance().createXMLStreamWriter(w);
    } catch (Exception e) {
      throw new RuntimeException("failed to create xml stream writer", e);
    }
  }

  /**
   *
   * serializes a Document to string
   *
   * @param doc
   * @return
   * @throws TransformerConfigurationException
   * @throws TransformerException
   * @throws TransformerFactoryConfigurationError
   */
  public static String serializeElement(Document doc) throws TransformerConfigurationException, TransformerException, TransformerFactoryConfigurationError {
    return serializeElement(doc.getDocumentElement());
  }


  /**
   * this returns an ISO compatible calendar. especially
   * <code>getFirstDayOfWeek() == 2 == Calendar.MONDAY</code>
   * and <code>getMinimalDaysInFirstWeek() == 4</code> are true.
   *
   * this is the only place where direct access to
   * java.util.Calendar.getInstance is allowed
   * @return an ISO compatible calendar.
   */
  public static Calendar getCalendar() {
    return Calendar.getInstance(Locale.GERMANY);
  }


  /**
   * Method getCalendar
   * @param locale
   * @return the calendar object for the specified location
   */
  public static Calendar getCalendar(Locale locale) {
      return Calendar.getInstance(locale);
  }

  /**
   * Read the Implementation-Version attribute from manifest
   * @return the attribute value or null if not found
   */
  public static String getBCDUIVersion() {
    if (bcduiVersion == null) {
      bcduiVersion = readBCDUIVersion();
      if (bcduiVersion == null) {
        bcduiVersion = ""; // mark as readed from manifest even if not found
      }
    }
    if ("".equals(bcduiVersion)) {
      return null; // return null for the readed but not valid value
    }
    return bcduiVersion;
  }

  /**
   * Read the Implementation-Version attribute from manifest
   * @return the attribute value or null if not found
   */
  private static String readBCDUIVersion() {
    try {
      Enumeration<URL> resEnum = Thread.currentThread().getContextClassLoader().getResources(JarFile.MANIFEST_NAME);
      while (resEnum.hasMoreElements()) {
        try {
          URL url = resEnum.nextElement();
          InputStream is = url.openStream();
          if (is != null) {
            Manifest manifest = new Manifest(is);
            Attributes mainAttribs = manifest.getMainAttributes();
            if ("BCDUI".equals(mainAttribs.getValue("Implementation-Title"))) {
              return mainAttribs.getValue("Implementation-Version");
            }
          }
        }
        catch (Exception e) {
          // Silently ignore wrong manifests on classpath?
        }
      }
    }
    catch (IOException e1) {
      // Silently ignore wrong manifests on classpath?
    }
    return null;
  }

  /**
   * A useful helper for overwriting the input Wrs in a filter for example
   * TODO In the long run, BCD-UI should allow passing DOM documents as such around, without "hiding them" in a wrapped ServletInputStream
   */
  static public class ServletInputStreamImpl extends ServletInputStream
  {
    private InputStream is;

    public ServletInputStreamImpl(InputStream is) {
      this.is = is;
    }

    public int read() throws IOException {
      return is.read();
    }

    public boolean markSupported() {
      return false;
    }

    public synchronized void mark(int i) {
      throw new RuntimeException(new IOException("mark/reset not supported"));
    }

    public synchronized void reset() throws IOException {
      throw new IOException("mark/reset not supported");
    }

    public int read(byte[] arg0) throws IOException {
      return is.read(arg0);
    }

    public int read(byte[] b, int off, int len) throws IOException {
      return is.read(b, off, len);
    }

    public int readLine(byte[] b, int off, int len) throws IOException {
      throw new RuntimeException(new IOException("readLine not supported"));
    }

    public long skip(long n) throws IOException {
      return is.skip(n);
    }
  }

  /**
   * Retrieves a session id from the session of given request, handles null-sessions with
   * non stable IDs created locally and stored in request. Sometimes you want to have an
   * ID for logging even for anonymous users, yet not forcing session creation on the container,
   * then this is perfect method to use.
   *
   * @param httpServletRequest -  to retrieve session id from; no session will be created
   *                              for this request if there is no existing unless forceSessionCreate
   *                              is set to true
   * @param forceSessionCreate -  force or not the creation of a session in case there is no
   *                              existing for current request. If session creation is not forced,
   *                              then the returned ID is considered unstable between multiple
   *                              requests.
   *
   * @return either ID of the http-session (if session is available) or a locally created identifier
   * which remains stable for the current servlet-request only. In case the ID is not retrieved from
   * a session, it is prefixed with 'bcd_'.
   */
  static public String getSessionId(HttpServletRequest httpServletRequest, boolean forceSessionCreate){
    HttpSession session = httpServletRequest.getSession(forceSessionCreate);
    if(session != null){
      return session.getId();
    }
    String id = (String)httpServletRequest.getAttribute(REQUEST_ATTR_CUSTOM_SESSION_ID);
    if(id == null){
      // create pseudo ID and store in current request object, keep smaller in size and trim to 32char
      id = ("bcd_" + DigestUtils.md5Hex(UUID.randomUUID().toString())).substring(0, 32);
      httpServletRequest.setAttribute(REQUEST_ATTR_CUSTOM_SESSION_ID, id);
    }
    return id;
  }

}